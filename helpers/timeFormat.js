export default function convertTo12Hour(timeStr) {
    if (!timeStr) return '—'

    const formatSingleTime = (time) => {
        const trimmed = time.trim()
        const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
        if (!match) return trimmed // Return original if it doesn't match HH:MM

        let [_, hours, minutes] = match
        hours = parseInt(hours, 10)
        const ampm = hours >= 12 ? 'PM' : 'AM'
        hours = hours % 12
        hours = hours ? hours : 12 // The hour '0' should be '12'

        const strHours = hours < 10 ? `0${hours}` : hours
        return `${strHours}:${minutes} ${ampm}`
    }

    // Handles both ranges ("08:00 - 14:00") and single instances ("14:00")
    if (timeStr.includes('-')) {
        return timeStr.split('-').map(formatSingleTime).join(' - ')
    }
    return formatSingleTime(timeStr)
}