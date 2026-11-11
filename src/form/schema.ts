export type Direction = "rtl" | "ltr"

export type CompareOp = "eq" | "neq" | "in" | "notIn" | "empty" | "notEmpty" | "gt" | "lt"

export interface ShowWhen {
    field: string
    op: CompareOp
    value?: string | number | boolean | Array<string | number | boolean>
}

export interface DialogSpec {
    presentation: "alert" | "sheet"
    title?: string
    body: string
    confirmText?: string
    cancelText?: string
}

export interface FieldDialogs {
    beforeNext?: DialogSpec
    beforePrev?: DialogSpec
    onActivate?: DialogSpec
    onToggle?: DialogSpec
}

export interface FieldBase {
    name?: string
    dir?: Direction
    className?: string
    visibleWhen?: ShowWhen | ShowWhen[]
    match?: "all" | "any"
    dialogs?: FieldDialogs
    /**
     * Slugs from `FormSchema.validators`. A field with no validators (missing or `[]`)
     * is optional. A field with one or more slugs is required and must pass each validator.
     */
    validators?: string[]
    /** Shown when the field is empty / required. */
    errorMessage?: string
    /** Per-validator message overrides, keyed by slug. */
    errorMessages?: Record<string, string>
}

/** @deprecated Prefer schema `validators` + field `validators` slugs. */
export type ValidationRule =
    | { type: "required"; message?: string }
    | { type: "persianName"; message?: string }
    | { type: "digits"; message?: string }
    | { type: "minLength"; value: number; message?: string }
    | { type: "maxLength"; value: number; message?: string }
    | { type: "pattern"; value: string; message?: string }
    | { type: "email"; message?: string }

export type FormValidator =
    | {
        /** Marks a field required. Format checks are separate slugs. */
        slug: string
        type: "required"
        message?: string
    }
    | {
        slug: string
        type: "numeric"
        /** Allow a single decimal point. Default false. */
        allowDecimal?: boolean
        message?: string
    }
    | {
        slug: string
        type: "chars"
        /**
         * Allowed characters, e.g. `"0123456789"` or Persian letters.
         * Every character in the value must appear in this string.
         */
        chars: string
        message?: string
    }
    | {
        slug: string
        type: "persianName"
        message?: string
    }
    | {
        slug: string
        type: "range"
        min?: number
        max?: number
        message?: string
    }
    | {
        slug: string
        type: "length"
        min?: number
        max?: number
        message?: string
    }
    | {
        slug: string
        type: "email"
        message?: string
    }
    | {
        slug: string
        type: "pattern"
        pattern: string
        message?: string
    }
    | {
        slug: string
        type: "jalaliDate"
        message?: string
    }

export interface TextFieldSchema extends FieldBase {
    type: "text"
    name: string
    label?: string
    placeholder?: string
    inputType?: "text" | "tel" | "email" | "number"
    /** @deprecated Use `validators` slugs. */
    required?: boolean
    /** @deprecated Use schema `validators` + field `validators` slugs. */
    rules?: ValidationRule[]
    defaultValue?: string
}

export interface RadioOption {
    value: string
    label: string
    hidden?: boolean
}

export interface RadioFieldSchema extends FieldBase {
    type: "radio"
    name: string
    label?: string
    /** @deprecated Use `validators` slugs. */
    required?: boolean
    options: RadioOption[]
    defaultValue?: string
}

export interface StageOption {
    value: string
    label: string
    hidden?: boolean
    items?: FormItem[]
}

export interface StageFieldSchema extends FieldBase {
    type: "stage"
    name: string
    label?: string
    /** @deprecated Use `validators` slugs. */
    required?: boolean
    options: StageOption[]
    defaultValue?: string
}

export interface SelectItem {
    title: string
    value?: string
    items?: FormItem[]
}

export interface SelectFieldSchema extends FieldBase {
    type: "select"
    name: string
    title: string
    /** @deprecated Use `validators` slugs. */
    required?: boolean
    items: SelectItem[]
    placeholder?: string
    defaultValue?: string
}

export interface DateFieldSchema extends FieldBase {
    type: "date"
    name: string
    title: string
    dialogTitle?: string
    placeholder?: string
    /** @deprecated Use `validators` slugs. */
    required?: boolean
    yearRange?: { min?: number; max?: number }
    formatMonthPreview?: "string" | "numeric"
    defaultValue?: string
}

export interface FileFieldSchema extends FieldBase {
    type: "file"
    name: string
    placeholder: string
    imagePlaceholder?: string
    camera?: "advanced" | "native"
    isVideo?: boolean
    sources?: Array<"camera" | "gallery">
    maxFileSize?: number
    /** @deprecated Use `validators` slugs. */
    required?: boolean
    rejectNameIncludes?: string[]
    useRear?: boolean
    allowChangeCamera?: boolean
    aspectRatio?: string
    width?: number
    height?: number
    captureHintTop?: string
    captureHintBottom?: string
    confirmHintTop?: string
    confirmHintBottom?: string
}

export interface AgreementFieldSchema extends FieldBase {
    type: "agreement"
    name: string
    label: string
    /** @deprecated Use `validators` slugs. */
    required?: boolean
    terms?: {
        title: string
        body: string
        presentation?: "alert" | "sheet"
    }
}

export interface TypographySchema extends FieldBase {
    type: "typography"
    variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span"
    text: string
    color?: string
    align?: "inherit" | "left" | "center" | "right" | "justify"
}

export type FormItem =
    | TextFieldSchema
    | RadioFieldSchema
    | StageFieldSchema
    | SelectFieldSchema
    | DateFieldSchema
    | FileFieldSchema
    | AgreementFieldSchema
    | TypographySchema

export interface FormPage {
    id: string
    title?: string
    description?: string
    nextLabel?: string
    prevLabel?: string
    skipWhen?: ShowWhen | ShowWhen[]
    match?: "all" | "any"
    beforeNext?: DialogSpec
    beforePrev?: DialogSpec
    items: FormItem[]
}

export interface FormTexts {
    next: string
    prev: string
    submit: string
    edit: string
    loading: string
    uploading: string
    required: string
    invalid: string
    selectPlaceholder: string
    confirm: string
    cancel: string
    cameraImage: string
    cameraVideo: string
    galleryPick: string
    uploadImage: string
    uploadVideo: string
    sendImage: string
    sendVideo: string
    retakeImage: string
    retakeVideo: string
    networkError: string
    fixErrors: string
    agreeRequired: string
    fileRequired: string
    understood: string
    finishedTitle: string
    finishedBody: string
    permissionDenied: string
}

export interface FormSchema {
    id: string
    table: string
    dir?: Direction
    texts?: Partial<FormTexts>
    /** Named validators referenced by field `validators` slugs. */
    validators?: FormValidator[]
    pages: FormPage[]
}
