import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "./Header";
import { Stepper } from "./Stepper";
import { CompanyDetailsStep } from "./CompanyDetailsStep";
import { FinancialSettingsStep } from "./FinancialSettingsStep";
import { ReviewConfirmStep } from "./ReviewConfirmStep";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { SuccessModal } from "./SuccessModal";
import { CompanyListModal } from "./CompanyListModal";
import { CompanyFormData, ValidationErrors } from "@/types/company";
import { useSettingsStore } from "@/store";
import { DEFAULT_SETTINGS } from "@/store/settings.store";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ROUTES, makeSettingsRoute } from "@/config";
import type { NavigateFunction } from "react-router-dom";
import type { CompanyProfile } from "@/types";

const DEFAULT_FINANCIAL = DEFAULT_SETTINGS.financial;
const DEFAULT_INVOICE = DEFAULT_SETTINGS.invoice;

function goToCompaniesSettings(
  navigate: NavigateFunction,
  companyId?: string | null,
) {
  const targetId = companyId ?? useSettingsStore.getState().activeCompanyId;
  navigate(
    makeSettingsRoute({
      section: "COMPANIES",
      companyId: targetId ?? undefined,
    }),
  );
}

const INITIAL_DATA: CompanyFormData = {
  details: {
    companyName: "",
    legalName: "",
    gstin: "",
    panNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
    logoUrl: "",
  },
  financial: {
    fyStartMonth: 4, // April — Indian accounting standard default
    currency: "INR",
    currencySymbol: "₹",
    taxType: "gst",
    invoicePrefix: "",
    invoiceStartingNumber: "1001",
    decimalPrecision: 2,
    enableMultiTax: true,
    enableRoundOff: true,
    // Banking kept in type but managed via Settings → Invoice & Numbering
    bankName: "",
    accountNo: "",
    ifsc: "",
    upiId: "",
  },
};

const DRAFT_STORAGE_KEY = "tfc_company_wizard_draft";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function hasValidationErrors(errors: ValidationErrors): boolean {
  return (
    Object.keys(errors.details).length > 0 ||
    Object.keys(errors.financial).length > 0
  );
}

interface CompanyWizardProps {
  mode?: "create" | "edit";
  /** Pass companyId directly when embedding in a modal (bypasses URL params). */
  companyId?: string;
  onComplete?: () => void | Promise<void>;
}

function generateInvoicePrefix(companyName: string): string {
  if (!companyName) return "INV";
  const initials = companyName
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  return `${initials}INV`;
}

export const CompanyWizard: React.FC<CompanyWizardProps> = ({
  mode = "create",
  companyId: companyIdProp,
  onComplete,
}) => {
  const navigate = useNavigate();
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  // Prefer the prop (modal embedding) over the URL param (routed page)
  const companyId = companyIdProp ?? companyIdParam;
  const { addCompany, updateCompany, companies } = useSettingsStore();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CompanyFormData>(INITIAL_DATA);

  // Load existing company data if in edit mode
  useEffect(() => {
    if (mode === "edit" && companyId && companies.length > 0) {
      const company = companies.find((c) => c.id === companyId);
      if (company) {
        const [monthStr] = (
          company.financial?.financialYearStart ?? "04-01"
        ).split("-");
        const fyStartMonth = parseInt(monthStr, 10) || 4;

        setFormData({
          details: {
            companyName: company.company.name,
            legalName: company.company.name,
            gstin: company.company.gstin ?? "",
            panNumber: company.pan ?? "",
            address: company.company.address,
            city: company.city ?? "",
            state: company.state ?? "",
            pincode: company.pincode ?? "",
            country: "India",
            phone: company.company.phone,
            phone2: company.company.phone2 ?? "",
            phone3: company.company.phone3 ?? "",
            logoUrl: company.logo ?? "",
          },
          financial: {
            fyStartMonth,
            currency: company.financial?.currency ?? "INR",
            currencySymbol: "₹",
            taxType: "gst",
            invoicePrefix: company.invoice?.salesPrefix ?? "INV",
            invoiceStartingNumber: String(
              company.invoice?.salesNextNo ?? 1001,
            ).padStart(4, "0"),
            decimalPrecision: 2,
            enableMultiTax: true,
            enableRoundOff: true,
            bankName: company.company.bankName ?? "",
            accountNo: company.company.accountNo ?? "",
            ifsc: company.company.ifsc ?? "",
            upiId: company.company.upiId ?? "",
          },
        });
      }
    } else if (mode === "create") {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        setFormData(JSON.parse(saved));
      }
    }
  }, [mode, companyId, companies]);

  const [errors, setErrors] = useState<ValidationErrors>({
    details: {},
    financial: {},
  });
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  // Auto-save and persistence
  useEffect(() => {
    if (mode === "create") {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
    }
    if (isDirty) {
      const timer = setTimeout(() => {
        setLastSavedTime(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        setIsDirty(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, isDirty]);

  const validateForm = useCallback(
    (data: CompanyFormData, strict = false): ValidationErrors => {
      const newErrors: ValidationErrors = {
        details: {},
        financial: {},
      };

      // Step 1: Company Details
      if (!data.details.companyName)
        newErrors.details.companyName = "Company name is required";
      if (!data.details.country)
        newErrors.details.country = "Country is required";

      if (strict) {
        if (!data.details.legalName)
          newErrors.details.legalName = "Legal business name is required";
        if (data.details.country === "India") {
          const gstin = data.details.gstin.trim().toUpperCase();
          if (gstin && gstin.length === 15 && !GSTIN_REGEX.test(gstin)) {
            newErrors.details.gstin =
              "Invalid GSTIN format (e.g. 24AAAAA0000A1Z5)";
          }
          const pan = data.details.panNumber.trim().toUpperCase();
          if (pan && pan.length === 10 && !PAN_REGEX.test(pan)) {
            newErrors.details.panNumber =
              "Invalid PAN format (e.g. ABCDE1234F)";
          }
        }
        if (!data.details.address)
          newErrors.details.address = "Street address is required";
        if (!data.details.city) newErrors.details.city = "City is required";
        if (!data.details.state) newErrors.details.state = "State is required";
        if (!data.details.pincode)
          newErrors.details.pincode = "Pincode is required";
        if (!data.details.phone) {
          newErrors.details.phone = "Phone number is required";
        } else if (!/^\d{10}$/.test(data.details.phone)) {
          newErrors.details.phone = "Invalid phone number (must be 10 digits)";
        }
      }

      // Step 2: Financial Settings
      // currency is fixed to INR — no validation needed

      if (strict) {
        if (
          !data.financial.fyStartMonth ||
          data.financial.fyStartMonth < 1 ||
          data.financial.fyStartMonth > 12
        )
          newErrors.financial.fyStartMonth =
            "Financial year start month is required";
        if (!data.financial.invoicePrefix)
          newErrors.financial.invoicePrefix = "Invoice prefix is required";
        if (!data.financial.invoiceStartingNumber)
          newErrors.financial.invoiceStartingNumber =
            "Starting invoice number is required";
      }

      return newErrors;
    },
    [],
  );

  const strictErrors = useMemo(
    () => validateForm(formData, true),
    [formData, validateForm],
  );

  // Only show validation errors on the review step (steps 1–2 are free to navigate)
  useEffect(() => {
    if (currentStep === 3) {
      setErrors(strictErrors);
    } else {
      setErrors({ details: {}, financial: {} });
    }
  }, [currentStep, strictErrors]);

  const handleUpdateDetails = (fields: Partial<CompanyFormData["details"]>) => {
    setFormData((prev) => {
      const nextDetails = { ...prev.details, ...fields };
      const nextFinancial = { ...prev.financial };

      // If company name changed, auto-generate prefix if it's still default or empty
      if (fields.companyName !== undefined) {
        const oldPrefix = generateInvoicePrefix(prev.details.companyName);
        if (
          !prev.financial.invoicePrefix ||
          prev.financial.invoicePrefix === oldPrefix ||
          prev.financial.invoicePrefix === "INV/"
        ) {
          nextFinancial.invoicePrefix = generateInvoicePrefix(
            fields.companyName,
          );
        }
      }

      return {
        ...prev,
        details: nextDetails,
        financial: nextFinancial,
      };
    });
    setIsDirty(true);
  };

  const handleUpdateFinancial = (
    fields: Partial<CompanyFormData["financial"]>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      financial: { ...prev.financial, ...fields },
    }));
    setIsDirty(true);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "This action will clear the onboarding draft and restore the wizard to its initial state. Are you sure you want to reset?",
    );

    if (confirmed) {
      setFormData(INITIAL_DATA);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setCurrentStep(1);
      setErrors({ details: {}, financial: {} });
    }
  };

  const handleSubmit = async () => {
    const submissionErrors = validateForm(formData, true);
    if (hasValidationErrors(submissionErrors)) {
      setErrors(submissionErrors);
      toast.error("Please complete all required fields before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "edit" && companyId) {
        const existingCompany = companies.find((c) => c.id === companyId);
        if (!existingCompany) throw new Error("Company not found");

        await updateCompany({
          ...existingCompany,
          company: {
            ...existingCompany.company,
            name: formData.details.companyName,
            address: formData.details.address,
            phone: formData.details.phone,
            phone2: formData.details.phone2 || undefined,
            phone3: formData.details.phone3 || undefined,
            email: formData.details.email ?? existingCompany.company.email,
            website:
              formData.details.website ?? existingCompany.company.website,
            gstin: formData.details.gstin,
          },
          financial: {
            ...(existingCompany.financial ?? DEFAULT_FINANCIAL),
            // Convert fyStartMonth (1-12) back to "MM-DD" format used in FinancialSettings
            financialYearStart: `${String(formData.financial.fyStartMonth ?? 4).padStart(2, "0")}-01`,
          },
          invoice: {
            ...(existingCompany.invoice ?? DEFAULT_INVOICE),
            salesPrefix:
              formData.financial.invoicePrefix ||
              (existingCompany.invoice?.salesPrefix ?? "INV"),
            salesNextNo:
              Number(formData.financial.invoiceStartingNumber) ||
              (existingCompany.invoice?.salesNextNo ?? 1001),
          },
          city: formData.details.city,
          state: formData.details.state,
          pincode: formData.details.pincode,
          pan: formData.details.panNumber,
          logo: formData.details.logoUrl,
        });
        toast.success("Company updated successfully");
        if (onComplete) {
          await Promise.resolve(onComplete());
        } else {
          goToCompaniesSettings(navigate, companyId);
        }
      } else {
        const newCompanyId = `co-${Date.now()}`;
        const currentSettings = useSettingsStore.getState().settings;
        const newCompany: CompanyProfile = {
          id: newCompanyId,
          company: {
            name: formData.details.companyName,
            tagline: "",
            address: formData.details.address,
            phone: formData.details.phone,
            email: formData.details.email ?? "",
            website: formData.details.website ?? "",
            gstin: formData.details.gstin,
            bankName: "",
            accountNo: "",
            ifsc: "",
            upiId: "",
            logo: formData.details.logoUrl,
          },
          financial: {
            ...currentSettings.financial,
            // Convert fyStartMonth (1-12) back to "MM-DD" format used in FinancialSettings
            financialYearStart: `${String(formData.financial.fyStartMonth ?? 4).padStart(2, "0")}-01`,
          },
          invoice: {
            ...currentSettings.invoice,
            salesPrefix:
              formData.financial.invoicePrefix ||
              currentSettings.invoice.salesPrefix,
            salesNextNo:
              Number(formData.financial.invoiceStartingNumber) ||
              currentSettings.invoice.salesNextNo,
          },
          createdAt: new Date().toISOString(),
          pan: formData.details.panNumber,
          city: formData.details.city,
          state: formData.details.state,
          pincode: formData.details.pincode,
          logo: formData.details.logoUrl,
        };

        await addCompany(newCompany);
        toast.success("Company created successfully");
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        if (onComplete) {
          await Promise.resolve(onComplete());
        } else {
          setShowSuccessModal(true);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save company settings",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate overall progress
  const calculateProgress = () => {
    const strictErrors = validateForm(formData, true);
    const totalRequiredFields = 15; // Estimated count of strict fields
    const filledRequiredFields =
      totalRequiredFields -
      (Object.keys(strictErrors.details).length +
        Object.keys(strictErrors.financial).length);
    return Math.round((filledRequiredFields / totalRequiredFields) * 100);
  };

  const getStepStatus = (
    stepId: number,
  ): "completed" | "warning" | "incomplete" | "pending" => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "completed";
    return "pending";
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header
        title={mode === "edit" ? "Edit Company" : "Create New Company"}
        onBackClick={() => {
          if (isDirty) {
            setShowUnsavedModal(true);
          } else if (mode === "edit") {
            if (onComplete) {
              void Promise.resolve(onComplete());
            } else {
              goToCompaniesSettings(navigate, companyId);
            }
          } else {
            // create mode — just close/go back, no company list
            if (onComplete) {
              void Promise.resolve(onComplete());
            } else {
              goToCompaniesSettings(navigate);
            }
          }
        }}
        lastSavedTime={lastSavedTime}
        isDirty={isDirty}
        onResetForm={handleReset}
      />

      <Stepper
        currentStep={currentStep}
        onStepClick={(step) => {
          setCurrentStep(step);
          window.scrollTo(0, 0);
        }}
        getStepStatus={getStepStatus}
      />

      <main className="max-w-5xl mx-auto w-full px-4 py-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
          <div className="p-5">
            {currentStep === 1 && (
              <CompanyDetailsStep
                data={formData.details}
                onChange={handleUpdateDetails}
                errors={errors.details}
              />
            )}
            {currentStep === 2 && (
              <FinancialSettingsStep
                data={formData.financial}
                onChange={handleUpdateFinancial}
                errors={errors.financial}
              />
            )}
            {currentStep === 3 && (
              <ReviewConfirmStep
                formData={formData}
                onEditStep={setCurrentStep}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                validationErrors={strictErrors}
              />
            )}
          </div>

          {currentStep < 3 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-0 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        onConfirm={() => {
          if (mode === "edit" && onComplete) {
            void Promise.resolve(onComplete());
          } else if (mode === "edit") {
            goToCompaniesSettings(navigate, companyId);
          } else if (onComplete) {
            void Promise.resolve(onComplete());
          } else {
            goToCompaniesSettings(navigate);
          }
        }}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        formData={formData}
        onDashboardClick={() => {
          navigate(ROUTES.dashboard);
        }}
        onCreateAnother={() => {
          setShowSuccessModal(false);
          setFormData(INITIAL_DATA);
          setCurrentStep(1);
        }}
        onConfigureTemplates={() => {
          navigate(makeSettingsRoute({ section: "INVOICE" }));
        }}
      />

      <CompanyListModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        onStartFresh={() => {
          setShowListModal(false);
          setFormData(INITIAL_DATA);
          setCurrentStep(1);
        }}
      />
    </div>
  );
};
