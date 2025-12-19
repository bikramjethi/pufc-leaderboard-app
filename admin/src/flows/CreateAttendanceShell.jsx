import { useMemo, useState } from 'react'

const DAYS = [
    { key: 0, label: 'Sunday' },
    { key: 1, label: 'Monday' },
    { key: 2, label: 'Tuesday' },
    { key: 3, label: 'Wednesday' },
    { key: 4, label: 'Thursday' },
    { key: 5, label: 'Friday' },
    { key: 6, label: 'Saturday' },
]

const pad = (n) => String(n).padStart(2, '0')

const dayName = (dateObj) =>
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    dateObj.getDay()
    ]

const generateMatches = (year, selectedDayKeys) => {
    const matches = []
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (!selectedDayKeys.includes(d.getDay())) continue
        const day = pad(d.getDate())
        const month = pad(d.getMonth() + 1)
        matches.push({
            id: `${year}-${month}-${day}`,
            date: `${day}/${month}/${year}`,
            day: dayName(d),
            matchPlayed: false,
            matchCancelled: false,
            attendance: [],
            winners: [],
            losers: [],
            scorers: [],
            ownGoals: [],
            cleanSheets: [],
        })
    }

    return matches
}

export const CreateAttendanceShell = () => {
    const currentYear = new Date().getFullYear()
    const [year, setYear] = useState(currentYear)
    const [selectedDays, setSelectedDays] = useState([2, 6]) // default Tuesday + Saturday
    const [status, setStatus] = useState('')
    const [error, setError] = useState('')
    const [existingCheck, setExistingCheck] = useState(null)

    const toggleDay = (key) => {
        setSelectedDays((prev) =>
            prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key].sort()
        )
    }

    const canGenerate = useMemo(() => {
        return (
            year &&
            Number(year) >= currentYear &&
            selectedDays.length > 0 &&
            existingCheck === false
        )
    }, [year, currentYear, selectedDays, existingCheck])

    const matches = useMemo(() => {
        if (!year || selectedDays.length === 0) return []
        return generateMatches(Number(year), selectedDays)
    }, [year, selectedDays])

    const checkExisting = async () => {
        setError('')
        setStatus('Checking...')
        try {
            const res = await fetch(`/src/data/attendance-data/${year}.json`, { method: 'HEAD' })
            if (res.ok) {
                setExistingCheck(true)
                setStatus(`File ${year}.json already exists in attendance-data.`)
            } else {
                setExistingCheck(false)
                setStatus(`No existing file found for ${year}. Ready to generate.`)
            }
        } catch (e) {
            // If HEAD fails (e.g., dev server), optimistically assume not existing
            setExistingCheck(false)
            setStatus(`Unable to verify on server; assuming ${year}.json does not exist.`)
        }
    }

    const handleGenerate = () => {
        setError('')
        if (Number(year) < currentYear) {
            setError('Year must not be a previous year.')
            return
        }
        if (selectedDays.length === 0) {
            setError('Select at least one matchday.')
            return
        }
        if (existingCheck === true) {
            setError(`attendance-data/${year}.json already exists.`)
            return
        }

        const payload = {
            season: Number(year),
            matches,
            allPlayers: [],
        }

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${year}.json`
        link.click()
        URL.revokeObjectURL(url)
        setStatus(`Generated ${year}.json. Save it to src/data/attendance-data/`)
    }

    return (
        <div className="flow-card">
            <div className="flow-header">
                <div>
                    <p className="flow-eyebrow">Flow</p>
                    <h2 className="flow-title">Create attendance shell data</h2>
                </div>
                <button className="flow-check-btn" onClick={checkExisting}>
                    Check existing file
                </button>
            </div>

            <div className="flow-body">
                <div className="flow-field">
                    <label className="flow-label">Year</label>
                    <input
                        type="number"
                        className="flow-input"
                        min={currentYear}
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="e.g. 2027"
                    />
                    <p className="flow-hint">Must be current year or future. Example: 2026.json format.</p>
                </div>

                <div className="flow-field">
                    <label className="flow-label">Matchdays</label>
                    <div className="flow-day-tabs">
                        {DAYS.map((d) => (
                            <button
                                key={d.key}
                                type="button"
                                className={`flow-day-tab ${selectedDays.includes(d.key) ? 'active' : ''}`}
                                onClick={() => toggleDay(d.key)}
                            >
                                {d.label.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                    <p className="flow-hint">Select all applicable matchdays (e.g., Tue + Sat).</p>
                </div>

                <div className="flow-summary">
                    <span>Matches to generate: {matches.length}</span>
                    {selectedDays.length > 0 && (
                        <span>
                            Days: {selectedDays.map((d) => DAYS.find((x) => x.key === d)?.label).join(', ')}
                        </span>
                    )}
                </div>

                {status && <div className="flow-status">{status}</div>}
                {error && <div className="flow-error">{error}</div>}
            </div>

            <div className="flow-footer">
                <button className="flow-primary-btn" onClick={handleGenerate} disabled={!canGenerate}>
                    Generate JSON
                </button>
                <p className="flow-hint">
                    Downloaded file should be saved to: <code>src/data/attendance-data/{year}.json</code>
                </p>
            </div>
        </div>
    )
}

