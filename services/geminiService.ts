import { GoogleGenerativeAI } from "@google/generative-ai";
import { Customer, InsuranceType } from "../types";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const GeminiService = {
  /**
   * Generates a personalized risk assessment based on limited user input.
   */
  async analyzeRisk(customerData: Partial<Customer>, type: InsuranceType): Promise<string> {
    if (!apiKey) return "API Anahtarı eksik. Risk analizi yapılamadı.";

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Sen uzman bir Türk sigorta danışmanısın. Aşağıdaki müşteri verilerine dayanarak kısa, profesyonel bir risk analizi ve öneri paragrafı yaz.
        
        Müşteri Verisi:
        Sigorta Türü: ${type}
        TC/Vergi No: ${customerData.tcKn || 'Bilinmiyor'}
        Plaka: ${customerData.plate || 'Yok'}
        
        Yanıtı Türkçe ver. Müşteriye hitap et. Riskleri ve neden bu sigortayı alması gerektiğini 2 cümle ile açıkla.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text() || "Risk analizi oluşturulamadı.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Yapay zeka şu anda meşgul. Lütfen daha sonra tekrar deneyiniz.";
    }
  },

  /**
   * Generates a professional policy proposal email/text.
   */
  async generateProposalMessage(customerName: string, policyType: string, bestPrice: number): Promise<string> {
    if (!apiKey) return "Otomatik teklif metni oluşturulamadı.";

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Aşağıdaki detaylara göre müşteriye gönderilmek üzere nazik, ikna edici ve profesyonel bir sigorta teklif mesajı (WhatsApp/Email formatında) oluştur.
        
        Müşteri: ${customerName}
        Ürün: ${policyType}
        En İyi Fiyat: ${bestPrice} TL
        
        Mesajda 'Global Hedef Sigorta' olarak bizden bahset. Hızlı onay için linke tıklamalarını söyle (linki [LINK] olarak bırak).
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text() || "Teklif metni oluşturulamadı.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Teklif metni oluşturulurken hata oluştu.";
    }
  },

  /**
   * Chat bot handler
   */
  async chatResponse(history: { role: string, parts: { text: string }[] }[], message: string): Promise<string> {
    if (!apiKey) return "Sistem şu anda yanıt veremiyor.";

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role === 'assistant' ? 'model' : h.role,
          parts: h.parts
        }))
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text() || "Anlaşılmadı.";
    } catch (error) {
      console.error("Chat Error:", error);
      return "Hata oluştu.";
    }
  }
};
