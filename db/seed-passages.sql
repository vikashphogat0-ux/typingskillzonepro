/* --------------------------------------------------------------------------- */
/* 3. Free Practice - English warm-up passage                                */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  NULL,  -- no template link for free practice
  'en',
  'Free Practice - English Warm-up',
  'Practice makes perfect. Regular typing practice improves speed and accuracy. Focus on proper finger placement and rhythm. The quick brown fox jumps over the lazy dog. This sentence contains all letters of the alphabet.',
  89
);

/* --------------------------------------------------------------------------- */
/* 4. Free Practice - Hindi warm-up passage                                  */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  NULL,  -- no template link for free practice
  'hi',
  'Free Practice - Hindi Warm-up',
  'अभ्यास से परिपूर्ण आते हैं। नियमित टाइपिंगअभ्यास गति और सटीकता में सुधार करता है। सही उंगली placement और लय पर ध्यान केंद्रित करें। तेज भूरा fox कछुए पर कूदता है। यह वाक्य वर्णमाला की सभी अक्षरों में शामिल है।',
  92
);

/* --------------------------------------------------------------------------- */
/* 5. High Court Clerical - English passage                                  */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  (SELECT id FROM exam_templates WHERE slug = 'high-court'),
  'en',
  'High Court Clerical - General Instructions',
  'All candidates must report to the examination hall 30 minutes before the scheduled test time. Bring valid photo identification and the admission letter. No electronic devices are permitted inside the examination hall. Answer sheets must be written in black ink only. Candidates must follow all invigilator instructions strictly.',
  112
);

/* --------------------------------------------------------------------------- */
/* 6. RRB NTPC English passage                                     */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  (SELECT id FROM exam_templates WHERE slug LIKE 'rrb%'),
  'en',
  'RRB NTPC General Awareness - Indian Railways',
  'Indian Railways is the fourth largest railway network in the world by size. It spans over 67,000 kilometers and carries over 8 billion passengers annually. The network was first introduced in India in 1853 during British rule. Today, Indian Railways operates both passenger and freight trains across the country.',
  118
);

/* --------------------------------------------------------------------------- */
/* 7. Delhi Police HCM Ministerial passage                               */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  (SELECT id FROM exam_templates WHERE slug = 'delhi-police-hcm'),
  'en',
  'Delhi Police HCM Ministerial - General Awareness',
  'The Delhi Police is the metropolitan police force of the National Capital Territory of Delhi. It has a strength of over 80,000 personnel and is responsible for maintaining law and order in the national capital. The force was established under the Delhi Police Act, 1978. Candidates should have knowledge of current events and general awareness.',
  122
);

/* --------------------------------------------------------------------------- */
/* 8. IBPS DEST English passage                                    */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  (SELECT id FROM exam_templates WHERE slug = 'ibps-dest'),
  'en',
  'IBPS DEST Data Entry - General Instructions',
  'Data entry operators must type a minimum of 8000 key depressions per hour. All entered data must be verified for accuracy. Sensitive personal information must be handled according to data protection guidelines. Error rate should not exceed the permissible limit specified in the notification.',
  97
);

/* --------------------------------------------------------------------------- */
/* 9. General English passage - current events                         */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  NULL,
  'en',
  'Current Events - Environmental Conservation',
  'Environmental conservation has become a global priority in recent years. Climate change, deforestation, and pollution pose significant threats to ecosystems worldwide. Governments and organizations are implementing various measures to reduce carbon emissions and protect natural resources. Individual actions, such as reducing waste and recycling, also contribute to environmental sustainability.',
  105
);

/* --------------------------------------------------------------------------- */
/* 10. General Hindi passage - वर्तमान घटनाएँ                       */
/* --------------------------------------------------------------------------- */
INSERT INTO passages (template_id, language, title, body, word_count) VALUES
(
  NULL,
  'hi',
  'वर्तमान घटनाएँ - पर्यावरण संरक्षण',
  'पर्यावरण संरक्षण ने हाल के वर्षों में एक वैश्विक प्राथमिकता बनाया है। जलवायु परिवर्तन, वनीकृती और प्रदूषण दुनिया भर के पारिस्थित तंत्र के लिए महत्वपूर्ण खतरे हैं। सरकारें और संगठन कार्बन उत्सर्जन कम करने और प्राकृतिक संसाधनों की रक्षा के लिए विभिन्न उपाय लागू कर रहे हैं। व्यक्तिगत कार्रवाई, जैसे कचरा कम करना और पुनर्चक्रण करना, पर्यावरणीय स्थिरता में भी योगदान देता है।',
  112
);