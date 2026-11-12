import {useKeenSlider, type KeenSliderOptions} from "keen-slider/react"
import "keen-slider/keen-slider.min.css"
import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react"
import {Box, Button} from "@mui/material"
import type {DateCalendar} from "../schema"

export interface DatePickerDataMonth {
    number: number
    string: string
}

export interface DatePickerData {
    y: number
    m: DatePickerDataMonth
    d: number
}

export interface DatePickerDefaultDate {
    year?: number
    month?: number
    day?: number
}

export interface NumberRange {
    min?: number
    max?: number
}

interface Props {
    onDataReady: (data: DatePickerData) => void
    defaultDate?: DatePickerDefaultDate
    yearRange?: NumberRange
    formatMonthPreview?: "string" | "numeric"
    confirmLabel?: string
    calendar?: DateCalendar
}

const MONTH_NAMES_JALALI = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

const MONTH_NAMES_GREGORIAN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

function toPersianNumber(value: number | string): string {
    return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])
}

function toEnglishNumber(value: string): string {
    return value
        .replace(/۰/g, "0").replace(/۱/g, "1").replace(/۲/g, "2").replace(/۳/g, "3").replace(/۴/g, "4")
        .replace(/۵/g, "5").replace(/۶/g, "6").replace(/۷/g, "7").replace(/۸/g, "8").replace(/۹/g, "9")
}

function formatDigit(value: number | string, calendar: DateCalendar): string {
    return calendar === "gregorian" ? String(value) : toPersianNumber(value)
}

export function currentJalaliYear(): number {
    return new Date().getFullYear() - 621
}

export function currentGregorianYear(): number {
    return new Date().getFullYear()
}

/** @deprecated Use currentJalaliYear */
export function currentYear(): number {
    return currentJalaliYear()
}

function daysInGregorianMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate()
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

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

const itemsTrackSx = {
    width: "100%",
    height: 150,
    margin: "0 4px",
    "& .keen-slider__slide": {
        ...itemSx,
    },
}

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

const SCROLL_ANIMATION = {
    duration: 500,
    easing: (t: number) => 1 + --t * t * t * t * t,
}

interface SliderData {
    slides: HTMLElement[]
    track: { details: { rel: number } }
    update: () => void
    moveToIdx: (idx: number, absolute?: boolean, animation?: typeof SCROLL_ANIMATION) => void
    size: number
}

function DatePicker2({
    onDataReady,
    defaultDate,
    yearRange,
    formatMonthPreview = "numeric",
    confirmLabel = "تایید",
    calendar = "jalali",
}: Props) {
    const monthNames = calendar === "gregorian" ? MONTH_NAMES_GREGORIAN : MONTH_NAMES_JALALI
    const gregorianNow = currentGregorianYear()
    const yearMin = yearRange?.min ?? (calendar === "gregorian" ? gregorianNow - 100 : 1400)
    const yearMax = yearRange?.max ?? (calendar === "gregorian" ? gregorianNow : 1410)
    const defaultYearFallback = calendar === "gregorian" ? gregorianNow : 1405

    const yearValues = useMemo(() => {
        const values: number[] = []
        for (let i = yearMax; i >= yearMin; i--) values.push(i)
        return values
    }, [yearMin, yearMax])

    const defaultsRef = useRef<{
        year: number
        month: DatePickerDataMonth
        day: number
        yearIdx: number
        monthIdx: number
        dayIdx: number
    } | null>(null)

    if (defaultsRef.current === null) {
        const y = clamp(defaultDate?.year ?? defaultYearFallback, yearMin, yearMax)
        const mNum = defaultDate?.month && defaultDate.month >= 1 && defaultDate.month <= 12
            ? defaultDate.month
            : 1
        const m = {number: mNum, string: monthNames[mNum - 1]}
        const maxDay = calendar === "gregorian" ? daysInGregorianMonth(y, mNum) : 31
        const d = clamp(defaultDate?.day && defaultDate.day >= 1 ? defaultDate.day : 1, 1, maxDay)
        const yearIdx = yearValues.indexOf(y)
        defaultsRef.current = {
            year: y,
            month: m,
            day: d,
            yearIdx: yearIdx >= 0 ? yearIdx : 0,
            monthIdx: clamp(12 - m.number, 0, 11),
            dayIdx: clamp(maxDay - d, 0, maxDay - 1),
        }
    }

    const defaults = defaultsRef.current
    const [year, setYear] = useState(defaults.year)
    const [month, setMonth] = useState<DatePickerDataMonth>(defaults.month)
    const [day, setDay] = useState(defaults.day)
    const defaultsApplied = useRef(false)

    const dayCount = calendar === "gregorian" ? daysInGregorianMonth(year, month.number) : 31

    const updateActiveSlide = useCallback((ins: SliderData) => {
        const activeIndex = ins.track.details.rel
        ins.slides.forEach((slide, index) => {
            if (index === activeIndex) slide.classList.add("date-picker-active")
            else slide.classList.remove("date-picker-active")
        })
    }, [])

    const onYearChanged = useCallback((ins: SliderData) => {
        updateActiveSlide(ins)
        const item = ins.slides[ins.track.details.rel]
        const value = parseInt(toEnglishNumber(item.textContent!!.trim()), 10)
        setYear(value)
    }, [updateActiveSlide])

    const onMonthChanged = useCallback((ins: SliderData) => {
        updateActiveSlide(ins)
        const item = ins.slides[ins.track.details.rel]
        setMonth({
            number: parseInt(item.getAttribute("data-id")!!, 10),
            string: item.textContent!!.trim(),
        })
    }, [updateActiveSlide])

    const onDayChanged = useCallback((ins: SliderData) => {
        updateActiveSlide(ins)
        const item = ins.slides[ins.track.details.rel]
        const value = parseInt(toEnglishNumber(item.textContent!!.trim()), 10)
        setDay(value)
    }, [updateActiveSlide])

    const baseSliderOptions = useMemo<KeenSliderOptions>(() => ({
        loop: false,
        vertical: true,
        mode: "free-snap",
        rubberband: true,
        slides: {perView: 3, spacing: 0, origin: "center"},
    }), [])

    const yearOptions = useMemo<KeenSliderOptions>(() => ({
        ...baseSliderOptions,
        slideChanged: onYearChanged,
        created: onYearChanged,
    }), [baseSliderOptions, onYearChanged])

    const monthOptions = useMemo<KeenSliderOptions>(() => ({
        ...baseSliderOptions,
        slideChanged: onMonthChanged,
        created: onMonthChanged,
    }), [baseSliderOptions, onMonthChanged])

    const dayOptions = useMemo<KeenSliderOptions>(() => ({
        ...baseSliderOptions,
        slideChanged: onDayChanged,
        created: onDayChanged,
    }), [baseSliderOptions, onDayChanged])

    const [yearRef, yearIns] = useKeenSlider(yearOptions)
    const [monthRef, monthIns] = useKeenSlider(monthOptions)
    const [dayRef, dayIns] = useKeenSlider(dayOptions)

    useEffect(() => {
        let cancelled = false
        let attempts = 0
        let timer: number | undefined

        const apply = () => {
            if (cancelled || defaultsApplied.current) return
            const yearSlider = yearIns.current
            const monthSlider = monthIns.current
            const daySlider = dayIns.current
            if (!yearSlider || !monthSlider || !daySlider) {
                if (attempts++ < 40) timer = window.setTimeout(apply, 40)
                return
            }
            yearSlider.update()
            monthSlider.update()
            daySlider.update()
            if (yearSlider.size <= 1) {
                if (attempts++ < 40) timer = window.setTimeout(apply, 40)
                return
            }
            defaultsApplied.current = true
            yearSlider.moveToIdx(defaults.yearIdx, true, SCROLL_ANIMATION)
            monthSlider.moveToIdx(defaults.monthIdx, true, SCROLL_ANIMATION)
            daySlider.moveToIdx(defaults.dayIdx, true, SCROLL_ANIMATION)
        }

        timer = window.setTimeout(apply, 60)
        return () => {
            cancelled = true
            if (timer !== undefined) window.clearTimeout(timer)
        }
    }, [defaults.yearIdx, defaults.monthIdx, defaults.dayIdx, yearIns, monthIns, dayIns])

    useEffect(() => {
        let nextDay = day
        setDay((current) => {
            nextDay = Math.min(current, dayCount)
            return nextDay
        })
        const daySlider = dayIns.current
        if (!daySlider || !defaultsApplied.current) return
        daySlider.update()
        daySlider.moveToIdx(clamp(dayCount - nextDay, 0, dayCount - 1), true)
        // Only when month/year changes the day count — avoid fighting the day wheel while scrolling.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayCount, dayIns])

    const months: ReactNode[] = monthNames.map((name, index) => (
        <Box
            key={`m_${index + 1}`}
            className="keen-slider__slide"
            data-id={index + 1}
            sx={itemSx}
        >
            {formatMonthPreview === "numeric"
                ? formatDigit(index + 1, calendar)
                : name}
        </Box>
    )).reverse()

    const days = (): ReactNode[] => {
        const items: ReactNode[] = []
        for (let i = dayCount; i >= 1; i--) {
            items.push(
                <Box key={`d_${i}`} className="keen-slider__slide" sx={itemSx}>
                    {formatDigit(i, calendar)}
                </Box>,
            )
        }
        return items
    }

    const years = (): ReactNode[] => yearValues.map((yearValue) => (
        <Box key={`y_${yearValue}`} className="keen-slider__slide" sx={itemSx}>
            {formatDigit(yearValue, calendar)}
        </Box>
    ))

    function submit() {
        const maxDay = calendar === "gregorian" ? daysInGregorianMonth(year, month.number) : 31
        onDataReady({
            y: year,
            m: month,
            d: Math.min(day, maxDay),
        })
    }

    return (
        <Box
            className="msf-date-picker"
            data-calendar={calendar}
            sx={{
                width: "100%",
                direction: calendar === "gregorian" ? "ltr" : "rtl",
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateRows: "1fr",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    columnGap: {xs: "7px", sm: "10px"},
                    mb: 2,
                    width: "100%",
                }}
            >
                <Box sx={columnSx}>
                    <Box sx={selectionSx}/>
                    <Box ref={yearRef} className="keen-slider" sx={itemsTrackSx}>
                        {years()}
                    </Box>
                </Box>
                <Box sx={columnSx}>
                    <Box sx={selectionSx}/>
                    <Box ref={monthRef} className="keen-slider" sx={itemsTrackSx}>
                        {months}
                    </Box>
                </Box>
                <Box sx={columnSx}>
                    <Box sx={selectionSx}/>
                    <Box ref={dayRef} className="keen-slider" sx={itemsTrackSx}>
                        {days()}
                    </Box>
                </Box>
            </Box>

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
                    fontSize: {xs: "1.05rem", sm: "1.1rem"},
                    boxShadow: "0 2px 5px rgba(0,0,0,0.20)",
                    "&:hover": {bgcolor: "#1976d2"},
                    "&:active": {transform: "scale(0.99)"},
                    transition: "transform 100ms ease",
                }}
            >
                {confirmLabel}
            </Button>
        </Box>
    )
}

export default DatePicker2
