import React from "react";
import { CompanyWizard } from "./company-wizard/CompanyWizard";

interface SetupWizardProps {
  onComplete: () => void | Promise<void>;
  onSeedDemo?: () => void | Promise<void>;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  onComplete,
  onSeedDemo,
}) => {
  return (
    <CompanyWizard
      mode="create"
      onComplete={onComplete}
      onSeedDemo={onSeedDemo}
    />
  );
};
