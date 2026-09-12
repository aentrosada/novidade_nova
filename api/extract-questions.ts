import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60, // Permite tempo suficiente para sintetizar as 20 fotos
};

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // Configura cabeçalhos de CORS e JSON
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error:
          "Chave GEMINI_API_KEY não configurada na Vercel. Vá em Project Settings > Environment Variables na Vercel e adicione GEMINI_API_KEY.",
      });
    }

    const { images } = req.body as {
      images?: Array<{ data: string; mimeType: string }>;
    };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: "Nenhuma imagem foi enviada. Envie entre 1 e 20 fotos.",
      });
    }

    if (images.length > 20) {
      return res.status(400).json({
        error: "Limite máximo de 20 fotos excedido.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-vercel",
        },
      },
    });

    const imageParts = images.map((img) => {
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

    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
    });

    let extractedText = response.text || "";
    extractedText = extractedText.trim();

    if (!extractedText.toLowerCase().startsWith("responda")) {
      extractedText = `responda\n\n${extractedText}`;
    }

    const questionMatches = extractedText.match(/quest[ãa]o\s+\d+/gi) || [];
    const questionsCount = Math.max(questionMatches.length, 1);

    return res.status(200).json({
      success: true,
      text: extractedText,
      questionsCount,
    });
  } catch (error: any) {
    console.error("Erro no handler Vercel:", error);
    return res.status(500).json({
      error:
        error?.message ||
        "Erro ao processar as fotos na Vercel. Verifique os logs da função.",
    });
  }
}
