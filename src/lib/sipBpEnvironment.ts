/**
 * Explicit environment flag configured by the deployment platform.
 * Vite's import.meta.env.PROD indicates build mode, not financial deployment.
 */
export const isProductionEnvironment = import.meta.env.VITE_SIP_BP_ENV === "production";
export const sipBpEnvironmentLabel = isProductionEnvironment ? "PROD" : "DEV";
