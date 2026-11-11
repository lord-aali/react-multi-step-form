import "./form/assets/fonts/vazirmatn/Vazirmatn-font-face.css"
import "./form/assets/fonts/vazirmatn-fd/Vazirmatn-font-face.css"
import "./form/form.css"

export {MultiStepForm} from "./form/MultiStepForm"
export type {MultiStepFormProps} from "./form/MultiStepForm"
export {createFormTheme} from "./form/theme/theme"
export {defaultTexts, resolveTexts} from "./form/texts"
export type {
    AgreementFieldSchema,
    CompareOp,
    DateFieldSchema,
    DialogSpec,
    Direction,
    FieldDialogs,
    FileFieldSchema,
    FormItem,
    FormPage,
    FormSchema,
    FormTexts,
    FormValidator,
    RadioFieldSchema,
    SelectFieldSchema,
    ShowWhen,
    StageFieldSchema,
    TextFieldSchema,
    TypographySchema,
    ValidationRule,
} from "./form/schema"
export {indexValidators, isFieldRequired, runValidator} from "./form/validators"
export {
    TAPSI_DIGIT_CHARS,
    TAPSI_PERSIAN_CHARS,
    checkValidation,
    validateBirthCertNumber,
    validateNumbers,
    validatePersianNameField,
    validatePersianText,
} from "./form/tapsiValidation"
