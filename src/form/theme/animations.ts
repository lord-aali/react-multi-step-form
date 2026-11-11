import {keyframes} from "@emotion/react"

export const slideInLeft = keyframes`
  0% { transform: translateX(-100px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
`

export const slideOutLeft = keyframes`
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(-100px); opacity: 0; }
`

export const slideInRight = keyframes`
  0% { transform: translateX(100px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
`

export const slideOutRight = keyframes`
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(100px); opacity: 0; }
`

export const contentAnimSx = (animClass: string) => {
    const base = {
        transition: "all 0.3s",
        opacity: 0,
    }
    switch (animClass) {
        case "active":
            return {...base, display: "block", opacity: 1}
        case "inactive":
            return {...base, display: "none", opacity: 0}
        case "leave-right":
            return {...base, display: "block", overflow: "hidden", animation: `${slideOutRight} 300ms forwards`}
        case "enter-right":
            return {...base, display: "block", overflow: "hidden", animation: `${slideInRight} 300ms forwards`}
        case "leave-left":
            return {...base, display: "block", overflow: "hidden", animation: `${slideOutLeft} 300ms forwards`}
        case "enter-left":
            return {...base, display: "block", overflow: "hidden", animation: `${slideInLeft} 300ms forwards`}
        default:
            return {...base, display: "none"}
    }
}
