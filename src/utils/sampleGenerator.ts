import { CapturedPhoto } from "../types";

export function generateSampleQuestionPhotos(): CapturedPhoto[] {
  const samples = [
    {
      title: "PROVA DE SAÚDE PÚBLICA - PARTE 1",
      questions: [
        "1. Qual é a principal preocupação do Brasil em relação à saúde pública e ao fortalecimento do SUS nos centros urbanos?",
        "2. Como a teoria de saúde prevê os próximos anos diante dos desafios demográficos e envelhecimento populacional?",
      ],
    },
    {
      title: "PROVA DE SAÚDE PÚBLICA - PARTE 2",
      questions: [
        "3. Quais são as principais medidas de prevenção e vigilância epidemiológica adotadas no controle de endemias?",
      ],
    },
  ];

  return samples.map((sample, idx) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Paper background
      ctx.fillStyle = "#faf7f2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle lines on paper
      ctx.strokeStyle = "#e8e2d5";
      ctx.lineWidth = 1;
      for (let y = 80; y < canvas.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(canvas.width - 40, y);
        ctx.stroke();
      }

      // Title
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 22px serif";
      ctx.fillText(sample.title, 50, 50);

      // Questions
      ctx.fillStyle = "#0f172a";
      ctx.font = "18px serif";
      let textY = 120;
      sample.questions.forEach((q) => {
        // Simple word wrap
        const words = q.split(" ");
        let line = "";
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 700 && i > 0) {
            ctx.fillText(line, 50, textY);
            line = words[i] + " ";
            textY += 32;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 50, textY);
        textY += 50;
      });
    }

    return {
      id: `sample_${idx + 1}_${Date.now()}`,
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      mimeType: "image/jpeg",
      timestamp: Date.now() + idx,
      name: `exemplo_questao_${idx + 1}.jpg`,
    };
  });
}
