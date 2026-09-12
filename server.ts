import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 50mb limit to allow up to 20 high-res camera photos
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Gemini API client
  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY não configurada no servidor.");
      }
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return geminiClient;
  }

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Extract and synthesize questions from images
  app.post("/api/extract-questions", async (req, res) => {
    try {
      const { images } = req.body as {
        images?: Array<{ data: string; mimeType: string }>;
      };

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          error: "Nenhuma imagem foi enviada. Forneça entre 1 e 20 imagens.",
        });
      }

      if (images.length > 20) {
        return res.status(400).json({
          error: "Limite máximo de 20 fotos excedido.",
        });
      }

      const ai = getGeminiClient();

      // Convert images to GenAI inline parts
      const imageParts = images.map((img) => {
        // Strip data:image/...;base64, prefix if present
        let base64Data = img.data;
        let mimeType = img.mimeType || "image/jpeg";

        if (base64Data.includes(",")) {
          const split = base64Data.split(",");
          const match = split[0].match(/:(.*?);/);
          if (match && match[1]) {
            mimeType = match[1];
          }
          base64Data = split[1];
        }

        return {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        };
      });

      const promptText = `Você é um digitalizador e sintetizador especializado em cadernos, provas e fotos de exercícios.
Analise todas as ${images.length} fotos anexadas com atenção máxima para extrair, digitalizar e sintetizar TODAS as perguntas/questões contidas nelas.

REQUISITO ESTRITO DE SAÍDA:
O texto do resultado DEVE iniciar obrigatoriamente com a palavra "responda" na primeira linha minúscula.
Em seguida, pule uma linha e liste todas as questões de forma ordenada e sintetizada, exatamente neste padrão:

responda
questão 1 - [texto sintetizado e completo da pergunta, incluindo opções/alternativas a/b/c/d/e caso existam]

questão 2 - [texto da questão 2]

...e assim sucessivamente.

REGRAS:
1. Elimine duplicatas se a mesma questão estiver em mais de uma foto.
2. Se uma questão estiver dividida entre duas fotos, junte o conteúdo em uma única questão completa.
3. Ordene todas as questões sequencialmente (questão 1, questão 2, etc.).
4. Não adicione saudações, introduções ou comentários adicionais além do formato pedido. Comece diretamente com "responda".`;

      const contents = {
        parts: [...imageParts, { text: promptText }],
      };

      // Call Gemini 3.8 Flash or Gemini 2.5 Flash
      const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
      });

      let extractedText = response.text || "";
      extractedText = extractedText.trim();

      // Ensure it starts with "responda" as requested by user
      if (!extractedText.toLowerCase().startsWith("responda")) {
        extractedText = `responda\n\n${extractedText}`;
      }

      // Count questions detected
      const questionMatches = extractedText.match(/quest[ãa]o\s+\d+/gi) || [];
      const questionsCount = Math.max(questionMatches.length, 1);

      res.json({
        success: true,
        text: extractedText,
        questionsCount,
      });
    } catch (error: any) {
      console.error("Erro ao digitalizar questões:", error);
      res.status(500).json({
        error:
          error?.message ||
          "Ocorreu um erro ao digitalizar as fotos das questões. Verifique as fotos e tente novamente.",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Falha fatal ao iniciar o servidor:", err);
});
