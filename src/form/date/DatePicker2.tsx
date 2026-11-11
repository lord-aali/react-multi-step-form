import {useKeenSlider, type KeenSliderOptions} from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Button} from "@mui/material";

export interface DatePickerDataMonth {
    number: number
    string: string
}

export interface DatePickerData {
    y: number,
    m: DatePickerDataMonth,
    d: number
}

export interface DatePickerDefaultDate {
    year?: number
    month?: number
    day?: number
}

export interface NumberRange {
    min?: number,
    max?: number
}

interface props {
    onDataReady: (data: DatePickerData) => void,
    defaultDate?: DatePickerDefaultDate,
    yearRange?: NumberRange,
    formatMonthPreview?: 'string' | 'numeric',
    confirmLabel?: string
}


/* =========================================================
   ماه‌ها
========================================================= */

const MONTH_NAMES = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
]


/* =========================================================
   تبدیل اعداد
========================================================= */

function toPersianNumber(value: number | string): string {
    return String(value).replace(
        /\d/g,
        digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]
    )
}


function toEnglishNumber(value: string): string {
    return value
        .replace(/۰/g, "0")
        .replace(/۱/g, "1")
        .replace(/۲/g, "2")
        .replace(/۳/g, "3")
        .replace(/۴/g, "4")
        .replace(/۵/g, "5")
        .replace(/۶/g, "6")
        .replace(/۷/g, "7")
        .replace(/۸/g, "8")
        .replace(/۹/g, "9")
}


/* =========================================================
   استایل آیتم‌ها
========================================================= */

const itemSx = {
    height: 50,
    width: "100%",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    fontSize: "1.05rem",
    fontWeight: 400,

    color: "#aeb4bb",

    userSelect: "none",
    WebkitUserSelect: "none",

    transition: "color 150ms ease, font-size 150ms ease, font-weight 150ms ease",

    "&.date-picker-active": {
        color: "#000",
        fontSize: "1.15rem",
        fontWeight: 700,
    },
}


/* =========================================================
   ستون Wheel
========================================================= */

const columnSx = {
    position: "relative",
    flexGrow: 1,
    height: 150,
    display: "flex",
    alignItems: "center",

    overflow: "hidden",

    "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 55,
        opacity: 0.9,
        zIndex: 2,
        pointerEvents: "none",
    },

    "&::after": {
        content: '""',
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 55,
        opacity: 0.9,
        zIndex: 2,
        pointerEvents: "none",
    },
}


/* =========================================================
   Keen Slider
========================================================= */

const itemsTrackSx = {
    width: "100%",
    height: 150,

    margin: "0 4px",

    "& .keen-slider__slide": {
        ...itemSx,
    },
}


/* =========================================================
   ناحیه انتخاب وسط
========================================================= */

const selectionSx = {
    position: "absolute",

    top: 50,
    left: 4,
    right: 4,

    height: 50,

    borderTop: "1px solid #e3e3e3",
    borderBottom: "1px solid #e3e3e3",

    pointerEvents: "none",

    zIndex: 3,
}


/* =========================================================
   Animation
========================================================= */

const SCROLL_ANIMATION = {
    duration: 500,

    easing: (t: number) =>
        1 + --t * t * t * t * t,
}


/* =========================================================
   Current Year
========================================================= */

export function currentYear(): number {
    return new Date().getFullYear() - 621
}


/* =========================================================
   Helpers
========================================================= */

function clamp(
    value: number,
    min: number,
    max: number
): number {
    return Math.min(
        Math.max(value, min),
        max
    )
}


function resolveYear(
    defaultDate: DatePickerDefaultDate | undefined,
    yearMin: number,
    yearMax: number
): number {

    const y =
        defaultDate?.year ??
        1405

    return clamp(
        y,
        yearMin,
        yearMax
    )
}


function resolveMonth(
    defaultDate: DatePickerDefaultDate | undefined
): DatePickerDataMonth {

    const m =
        defaultDate?.month

    if (
        m &&
        m >= 1 &&
        m <= 12
    ) {
        return {
            number: m,
            string: MONTH_NAMES[m - 1]
        }
    }

    return {
        number: 1,
        string: MONTH_NAMES[0]
    }
}


function resolveDay(
    defaultDate: DatePickerDefaultDate | undefined
): number {

    const d =
        defaultDate?.day

    if (
        d &&
        d >= 1 &&
        d <= 31
    ) {
        return d
    }

    return 1
}


/* =========================================================
   Slider Shape
========================================================= */

interface SliderData {
    slides: HTMLElement[]
    track: {
        details: {
            rel: number
        }
    }
}


/* =========================================================
   DatePicker
========================================================= */

function DatePicker2({
                         onDataReady,
                         defaultDate,
                         yearRange,
                         formatMonthPreview = 'numeric',
                         confirmLabel = "تایید",
                     }: props) {

    /*
       سال‌ها به صورت پیش‌فرض:
       ۱۴۱۰ تا ۱۴۰۰
    */

    const yearMin =
        yearRange?.min ?? 1400

    const yearMax =
        yearRange?.max ?? 1410


    /* =====================================================
       سال‌ها از بالا به پایین
    ===================================================== */

    const yearValues = useMemo(
        () => {

            const values: number[] = []

            for (
                let i = yearMax;
                i >= yearMin;
                i--
            ) {
                values.push(i)
            }

            return values

        },
        [yearMin, yearMax]
    )


    /* =====================================================
       Defaults
    ===================================================== */

    const defaultsRef = useRef<{
        year: number
        month: DatePickerDataMonth
        day: number
        yearIdx: number
        monthIdx: number
        dayIdx: number
    } | null>(null)


    if (
        defaultsRef.current === null
    ) {

        const y =
            resolveYear(
                defaultDate,
                yearMin,
                yearMax
            )

        const m =
            resolveMonth(defaultDate)

        const d =
            resolveDay(defaultDate)


        /*
           چون سال‌ها نزولی هستند:
           ۱۴۱۰ = index 0
           ۱۴۰۹ = index 1
           ...
           ۱۴۰۰ = index 10
        */

        const yearIdx =
            yearValues.indexOf(y)


        defaultsRef.current = {

            year: y,

            month: m,

            day: d,

            yearIdx:
                yearIdx >= 0
                    ? yearIdx
                    : 0,

            monthIdx:
                clamp(
                    12 - m.number,
                    0,
                    11
                ),

            dayIdx:
                clamp(
                    31 - d,
                    0,
                    30
                ),
        }
    }


    const defaults =
        defaultsRef.current


    /* =====================================================
       State
    ===================================================== */

    const [year, setYear] =
        useState(defaults.year)

    const [month, setMonth] =
        useState<DatePickerDataMonth>(
            defaults.month
        )

    const [day, setDay] =
        useState(defaults.day)


    const defaultsApplied =
        useRef(false)


    /* =====================================================
       Active Slide
    ===================================================== */

    const updateActiveSlide =
        useCallback(
            (ins: SliderData) => {

                const activeIndex =
                    ins.track.details.rel


                ins.slides.forEach(
                    (slide, index) => {

                        if (
                            index === activeIndex
                        ) {

                            slide.classList.add(
                                "date-picker-active"
                            )

                        } else {

                            slide.classList.remove(
                                "date-picker-active"
                            )

                        }

                    }
                )

            },
            []
        )


    /* =====================================================
       Year Changed
    ===================================================== */

    const onYearChanged =
        useCallback(
            (ins: SliderData) => {

                updateActiveSlide(ins)


                const item =
                    ins.slides[
                        ins.track.details.rel
                        ]


                const value =
                    parseInt(
                        toEnglishNumber(
                            item.textContent!!.trim()
                        )
                    )


                setYear(value)
            },
            [updateActiveSlide]
        )


    /* =====================================================
       Month Changed
    ===================================================== */

    const onMonthChanged =
        useCallback(
            (ins: SliderData) => {

                updateActiveSlide(ins)


                const item =
                    ins.slides[
                        ins.track.details.rel
                        ]


                setMonth({

                    number: parseInt(
                        item.getAttribute(
                            "data-id"
                        )!!
                    ),

                    string:
                        item.textContent!!
                            .trim(),
                })
            },
            [updateActiveSlide]
        )


    /* =====================================================
       Day Changed
    ===================================================== */

    const onDayChanged =
        useCallback(
            (ins: SliderData) => {

                updateActiveSlide(ins)


                const item =
                    ins.slides[
                        ins.track.details.rel
                        ]


                const value =
                    parseInt(
                        toEnglishNumber(
                            item.textContent!!.trim()
                        )
                    )


                setDay(value)
            },
            [updateActiveSlide]
        )


    /* =====================================================
       Slider Options
    ===================================================== */

    const baseSliderOptions =
        useMemo<
            KeenSliderOptions
        >(
            () => ({
                loop: false,

                vertical: true,

                mode: "free-snap",

                rubberband: true,

                slides: {
                    perView: 3,

                    spacing: 0,

                    origin: "center",
                },
            }),
            []
        )


    const yearOptions =
        useMemo<
            KeenSliderOptions
        >(
            () => ({

                ...baseSliderOptions,

                slideChanged:
                onYearChanged,

                created:
                onYearChanged,

            }),
            [
                baseSliderOptions,
                onYearChanged
            ]
        )


    const monthOptions =
        useMemo<
            KeenSliderOptions
        >(
            () => ({

                ...baseSliderOptions,

                slideChanged:
                onMonthChanged,

                created:
                onMonthChanged,

            }),
            [
                baseSliderOptions,
                onMonthChanged
            ]
        )


    const dayOptions =
        useMemo<
            KeenSliderOptions
        >(
            () => ({

                ...baseSliderOptions,

                slideChanged:
                onDayChanged,

                created:
                onDayChanged,

            }),
            [
                baseSliderOptions,
                onDayChanged
            ]
        )


    /* =====================================================
       Sliders
    ===================================================== */

    const [yearRef, yearIns] =
        useKeenSlider(yearOptions)

    const [monthRef, monthIns] =
        useKeenSlider(monthOptions)

    const [dayRef, dayIns] =
        useKeenSlider(dayOptions)


    /* =====================================================
       Apply Defaults
    ===================================================== */

    useEffect(() => {

        let cancelled = false

        let attempts = 0

        let timer:
            number | undefined


        const apply = () => {

            if (
                cancelled ||
                defaultsApplied.current
            ) {
                return
            }


            const yearSlider =
                yearIns.current

            const monthSlider =
                monthIns.current

            const daySlider =
                dayIns.current


            if (
                !yearSlider ||
                !monthSlider ||
                !daySlider
            ) {

                if (
                    attempts++ < 40
                ) {

                    timer =
                        window.setTimeout(
                            apply,
                            40
                        )
                }

                return
            }


            yearSlider.update()
            monthSlider.update()
            daySlider.update()


            if (
                yearSlider.size <= 1
            ) {

                if (
                    attempts++ < 40
                ) {

                    timer =
                        window.setTimeout(
                            apply,
                            40
                        )
                }

                return
            }


            defaultsApplied.current =
                true


            yearSlider.moveToIdx(
                defaults.yearIdx,
                true,
                SCROLL_ANIMATION
            )


            monthSlider.moveToIdx(
                defaults.monthIdx,
                true,
                SCROLL_ANIMATION
            )


            daySlider.moveToIdx(
                defaults.dayIdx,
                true,
                SCROLL_ANIMATION
            )

        }


        timer =
            window.setTimeout(
                apply,
                60
            )


        return () => {

            cancelled = true

            if (
                timer !== undefined
            ) {
                window.clearTimeout(timer)
            }

        }

    }, [
        defaults.yearIdx,
        defaults.monthIdx,
        defaults.dayIdx,
        yearIns,
        monthIns,
        dayIns
    ])


    /* =====================================================
       Month Items
    ===================================================== */

    const months: ReactNode[] =
        MONTH_NAMES.map(
            (name, index) => (

                <Box
                    key={`m_${index + 1}`}
                    className="keen-slider__slide"
                    data-id={index + 1}
                    sx={itemSx}
                >
                    {formatMonthPreview === 'numeric'
                        ? toPersianNumber(index + 1)
                        : name}
                </Box>

            )
        ).reverse()


    /* =====================================================
       Day Items
    ===================================================== */

    const days = (): ReactNode[] => {

        const items: ReactNode[] = []


        for (let i = 31; i >= 1; i--) {
            items.push(
                <Box
                    key={`d_${i}`}
                    className="keen-slider__slide"
                    sx={itemSx}
                >
                    {toPersianNumber(i)}
                </Box>
            )
        }


        return items
    }


    /* =====================================================
       Year Items
    ===================================================== */

    const years = (): ReactNode[] => {

        return yearValues.map(
            yearValue => (

                <Box
                    key={`y_${yearValue}`}
                    className="keen-slider__slide"
                    sx={itemSx}
                >
                    {toPersianNumber(yearValue)}
                </Box>

            )
        )
    }


    /* =====================================================
       Submit
    ===================================================== */

    function submit() {

        onDataReady({

            y: year,

            m: month,

            d: day

        })
    }


    /* =====================================================
       UI
    ===================================================== */

    return (

        <Box
            className="msf-date-picker"
            sx={{
                width: "100%",
                direction: "rtl",
            }}
        >
            {/* ================================
                Picker
            ================================= */}

            <Box
                sx={{
                    display: "grid",

                    gridTemplateRows: "1fr",

                    gridTemplateColumns:
                        "repeat(3, 1fr)",

                    columnGap: {
                        xs: "7px",
                        sm: "10px"
                    },

                    mb: 2,

                    width: "100%",
                }}
            >

                {/* =================================
                    Year
                ================================== */}

                <Box sx={columnSx}>

                    <Box
                        sx={selectionSx}
                    />

                    <Box
                        ref={yearRef}
                        className="keen-slider"
                        sx={itemsTrackSx}
                    >
                        {years()}
                    </Box>

                </Box>


                {/* =================================
                    Month
                ================================== */}

                <Box sx={columnSx}>

                    <Box
                        sx={selectionSx}
                    />

                    <Box
                        ref={monthRef}
                        className="keen-slider"
                        sx={itemsTrackSx}
                    >
                        {months}
                    </Box>

                </Box>


                {/* =================================
                    Day
                ================================== */}

                <Box sx={columnSx}>

                    <Box
                        sx={selectionSx}
                    />

                    <Box
                        ref={dayRef}
                        className="keen-slider"
                        sx={itemsTrackSx}
                    >
                        {days()}
                    </Box>

                </Box>

            </Box>


            {/* ================================
                Confirm Button
            ================================= */}

            <Button
                className="msf-date-confirm"
                onClick={submit}
                fullWidth
                sx={{
                    height: 46,

                    borderRadius: "32px",

                    bgcolor: "#1976d2",

                    color: "#fff",

                    fontWeight: 700,

                    fontSize: {
                        xs: "1.05rem",
                        sm: "1.1rem"
                    },

                    boxShadow:
                        "0 2px 5px rgba(0,0,0,0.20)",

                    "&:hover": {
                        bgcolor: "#1976d2",
                    },

                    "&:active": {
                        transform:
                            "scale(0.99)",
                    },

                    transition:
                        "transform 100ms ease",
                }}
            >
                {confirmLabel}
            </Button>

        </Box>
    )
}


export default DatePicker2