-- Safe, repeatable seed for the public Passage Library and free practice.
-- This inserts only missing starter passages; it never deletes or overwrites user/admin content.
INSERT INTO passages (template_id, language, title, body, word_count)
SELECT NULL, seed.language, seed.title, seed.body, seed.word_count
FROM (VALUES
  ('en', 'Daily Practice — Public Service', 'Public service depends on patience, accuracy and responsibility. Clear records help offices deliver reliable services to citizens. Regular typing practice improves coordination and confidence. Candidates should maintain a steady rhythm, read each sentence carefully and review mistakes after every practice session.', 40),
  ('en', 'Daily Practice — Digital India', 'Digital services help people access information, complete applications and communicate with public offices more efficiently. Reliable technology works best when people use it carefully. A skilled typist combines speed with accuracy, checks details before submitting work and learns from every correction.', 39),
  ('hi', 'दैनिक अभ्यास — सार्वजनिक सेवा', 'सार्वजनिक सेवा में धैर्य, शुद्धता और जिम्मेदारी का विशेष महत्व है। स्पष्ट अभिलेख कार्यालयों को नागरिकों तक बेहतर सुविधाएँ पहुँचाने में सहायता करते हैं। नियमित टंकण अभ्यास से गति, तालमेल और आत्मविश्वास बढ़ता है। प्रत्येक अभ्यास के बाद गलतियों की समीक्षा करें।', 39),
  ('hi', 'दैनिक अभ्यास — डिजिटल भारत', 'डिजिटल सेवाएँ लोगों को जानकारी प्राप्त करने और सरकारी आवेदन जमा करने में सहायता करती हैं। तकनीक का सही उपयोग समय बचाता है और काम को सरल बनाता है। एक कुशल टंकक गति के साथ शुद्धता बनाए रखता है और हर अभ्यास से सीखता है।', 37)
) AS seed(language, title, body, word_count)
WHERE NOT EXISTS (
  SELECT 1 FROM passages p WHERE p.language = seed.language AND p.title = seed.title
);
