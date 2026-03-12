const fs = require('fs');
const p = 'src/pages/MyLecturesPage.tsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Replace imports to ensure useEffect is there
if (!content.includes('useEffect')) {
    content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");
}

// 2. Replace the Rescheduling Calendar Logic block
const blockStart = `    // Rescheduling Calendar Logic`;
const blockEnd = `    const getTimeRange`;

const newBlock = `    // Rescheduling Calendar Logic
    const durationOptions = [
        { value: '', label: 'Select duration' },
        { value: '1', label: '1 hour' },
        { value: '1.5', label: '1.5 hours' },
        { value: '2', label: '2 hours' },
        { value: '3', label: '3 hours' },
    ];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    const [availableSlotsGrid, setAvailableSlotsGrid] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    useEffect(() => {
        if (duration && reschedulingSession) {
            setIsLoadingSlots(true);
            // Since the UI uses mock sessions "test-session-1-X", force fallback to real Session ID = 1 for testing purposes.
            // In full production, session.id would just be the database sessionid.
            const sessionIdStr = reschedulingSession.id.toString().includes('test-session') ? '1' : reschedulingSession.id;
            
            fetch(\`http://localhost:5000/sessions/available-slots?sessionId=\${sessionIdStr}&durationHours=\${duration}&weekOffset=\${selectedWeek}\`)
                .then(res => res.json())
                .then(data => {
                    setAvailableSlotsGrid(Array.isArray(data) ? data : []);
                    setIsLoadingSlots(false);
                })
                .catch(err => {
                    console.error(err);
                    setIsLoadingSlots(false);
                });
        } else {
            setAvailableSlotsGrid([]);
        }
    }, [duration, selectedWeek, reschedulingSession]);

    const timeSlots = availableSlotsGrid.length > 0 ? availableSlotsGrid[0].slots.map((s: any) => s.time) : [];

    const getWeekDates = () => {
        if (availableSlotsGrid.length === 0) return ['', '', '', '', ''];
        return availableSlotsGrid.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
    };

    const isSlotAvailable = (day: string, time: string): { available: boolean; reason?: string } => {
        if (!duration) return { available: false, reason: 'Select duration' };
        if (availableSlotsGrid.length === 0) return { available: false, reason: 'Loading...' };
        
        const dayObj = availableSlotsGrid.find(d => d.day === day);
        if (!dayObj) return { available: false, reason: 'No data' };
        
        const slotObj = dayObj.slots.find((s: any) => s.time === time);
        if (!slotObj) return { available: false, reason: 'No data' };
        
        if (slotObj.status === 'AVAILABLE') return { available: true };
        return { available: false, reason: slotObj.reason || 'Busy' };
    };

`;

const startIdx = content.indexOf(blockStart);
const endIdx = content.indexOf(blockEnd);

if(startIdx > -1 && endIdx > -1) {
    content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
    console.log('Main logic block replaced');
} else {
    console.log('Could not find block bounds');
}

// 3. Fix the weekDates instantiation
content = content.replace("const weekDates = getWeekDates(selectedWeek);", "const weekDates = getWeekDates();");

// 4. In the UI, handle the loading state
const targetUI = `{duration && (\\s*<Card padding="none">)`;
const re = new RegExp(targetUI, 'g');
let matchCount = 0;
content = content.replace(re, (match, p1) => {
    matchCount++;
    return `{duration && (
                                    <Card padding="none">
                                        {isLoadingSlots && (
                                            <div className="p-4 text-center text-blue-600 font-bold">
                                                Loading real available slots from server...
                                            </div>
                                        )}`;
});
console.log('UI loading state injected: ' + matchCount + ' times');

fs.writeFileSync(p, content, 'utf8');
console.log('Successfully completed replace script');
