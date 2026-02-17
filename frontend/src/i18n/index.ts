import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { landingTranslations } from "./landing";

const resources = {
  uz: { translation: { ...landingTranslations.uz } },
  en: { translation: { ...landingTranslations.en } },
  ru: { translation: {} },
  ar: { translation: { ...landingTranslations.ar } },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "uz",
  fallbackLng: "en",
  supportedLngs: ["uz", "en", "ar", "ru"],
  interpolation: { escapeValue: false },
});

export default i18n;
