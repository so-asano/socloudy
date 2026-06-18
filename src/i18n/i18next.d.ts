import "i18next";

// Type the translation resources from the ja JSON so t() keys are checked.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof import("./locales/ja.json");
    };
  }
}
