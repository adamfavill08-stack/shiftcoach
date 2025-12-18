/**
 * Comprehensive Shift Pattern Catalog
 * Contains shift patterns from around the world for 24h, 16h, 12h, 10h, 8h, 6h, and 4h shifts
 */

export type ShiftLength = '24h' | '16h' | '12h' | '10h' | '8h' | '6h' | '4h' | 'custom'

export type ShiftPattern = {
  id: string
  label: string
  description: string
  cycleLength: number // Days in the pattern cycle
  category: 'standard' | 'rotating' | 'continental' | 'panama' | 'dupont' | 'custom'
  commonIn?: string[] // Countries/industries where this is common
}

export const COMPREHENSIVE_PATTERNS: Record<ShiftLength, ShiftPattern[]> = {
  '24h': [
    // 24-Hour Shift Patterns (Emergency Services, Healthcare)
    {
      id: '24h-24on-48off',
      label: '24 on / 48 off',
      description: 'Work 24 consecutive hours followed by 48 hours off. Most common in fire services and emergency medical services.',
      cycleLength: 3,
      category: 'standard',
      commonIn: ['Fire Services', 'Emergency Medical Services', 'Paramedics', 'USA', 'Canada'],
    },
    {
      id: '24h-48on-96off',
      label: '48 on / 96 off',
      description: 'Work 48 consecutive hours followed by 96 hours off. Provides extended recovery time after intense work blocks.',
      cycleLength: 6,
      category: 'standard',
      commonIn: ['Fire Services', 'Emergency Services', 'Rural Healthcare'],
    },
    {
      id: '24h-kelly-schedule',
      label: 'Kelly Schedule',
      description: '24 on, 24 off, 24 on, 24 off, 24 on, then 96 hours off. Classic fire service schedule providing regular breaks.',
      cycleLength: 9,
      category: 'rotating',
      commonIn: ['Fire Services', 'USA', 'Emergency Services'],
    },
    {
      id: '24h-24on-24off',
      label: '24 on / 24 off',
      description: 'Alternating 24-hour shifts with 24 hours off. Continuous coverage with equal rest periods.',
      cycleLength: 2,
      category: 'rotating',
      commonIn: ['Emergency Services', 'Healthcare', 'Security'],
    },
    {
      id: '24h-24on-72off',
      label: '24 on / 72 off',
      description: 'One 24-hour shift followed by three full days off. Excellent work-life balance for 24h shifts.',
      cycleLength: 4,
      category: 'rotating',
      commonIn: ['Emergency Services', 'Healthcare', 'Rural Services'],
    },
    {
      id: '24h-custom',
      label: 'Custom 24h pattern',
      description: 'Build your own 24h pattern to match your specific rota requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],

  '10h': [
    // 10-Hour Shift Patterns
    {
      id: '10h-4on-3off',
      label: '4 on / 3 off (4/10 Schedule)',
      description: 'Four consecutive 10-hour shifts followed by three days off. Popular compressed workweek pattern.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Manufacturing', 'Logistics', 'Healthcare', 'USA', 'Canada'],
    },
    {
      id: '10h-6on-4off',
      label: '6 on / 4 off',
      description: 'Six consecutive 10-hour shifts followed by four days off. Rotates through day, swing, and night shifts.',
      cycleLength: 10,
      category: 'rotating',
      commonIn: ['Manufacturing', 'Logistics', 'Production'],
    },
    {
      id: '10h-5on-2off',
      label: '5 on / 2 off',
      description: 'Five consecutive 10-hour shifts followed by two days off. Standard compressed workweek.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Manufacturing', 'Office', 'Retail'],
    },
    {
      id: '10h-3on-2off',
      label: '3 on / 2 off',
      description: 'Three 10-hour shifts followed by two days off. Provides frequent breaks with extended daily hours.',
      cycleLength: 5,
      category: 'rotating',
      commonIn: ['Healthcare', 'Retail', 'Hospitality'],
    },
    {
      id: '10h-2d-2n-4off',
      label: '2 days / 2 nights / 4 off',
      description: 'Two day shifts, two night shifts, then four days off. Balanced rotation with extended recovery.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['Healthcare', 'Manufacturing', 'Logistics'],
    },
    {
      id: '10h-4on-4off',
      label: '4 on / 4 off',
      description: 'Four 10-hour shifts followed by four days off. Excellent work-life balance for 10h shifts.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['Manufacturing', 'Logistics', 'Production'],
    },
    {
      id: '10h-custom',
      label: 'Custom 10h pattern',
      description: 'Build your own 10h pattern to match your specific rota requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],

  '8h': [
    // Standard Patterns
    {
      id: '8h-5on-2off-days',
      label: '5 on / 2 off · Mon–Fri days',
      description: 'Standard Monday to Friday day shifts with weekends off. Most common office/retail pattern.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['UK', 'USA', 'Australia', 'Retail', 'Office'],
    },
    {
      id: '8h-5on-2off-rotating',
      label: '5 on / 2 off · Rotating',
      description: 'Five consecutive working days followed by two days off, rotating through the week.',
      cycleLength: 7,
      category: 'rotating',
      commonIn: ['Healthcare', 'Hospitality', 'Retail'],
    },
    {
      id: '8h-4on-2off',
      label: '4 on / 2 off',
      description: 'Four working days followed by two days off. Provides good work-life balance.',
      cycleLength: 6,
      category: 'rotating',
      commonIn: ['Healthcare', 'Manufacturing', 'Logistics'],
    },
    {
      id: '8h-4on-3off',
      label: '4 on / 3 off',
      description: 'Four working days followed by three days off. Excellent recovery time.',
      cycleLength: 7,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services'],
    },
    {
      id: '8h-6on-3off',
      label: '6 on / 3 off',
      description: 'Six consecutive working days followed by three days off. High intensity with regular breaks.',
      cycleLength: 9,
      category: 'rotating',
      commonIn: ['Healthcare', 'Security', 'Manufacturing'],
    },
    {
      id: '8h-7on-2off-7off',
      label: '7 on / 2 off / 7 off',
      description: 'Block of seven worked days, two days off, then seven days off. Intense but with long recovery.',
      cycleLength: 16,
      category: 'rotating',
      commonIn: ['Oil & Gas', 'Mining', 'Remote Work'],
    },
    
    // Early/Late/Night Rotations
    {
      id: '8h-2e-2l-4off',
      label: '2 early / 2 late / 4 off',
      description: 'Two early shifts, two late shifts, then four days off. Good for teams mixing shift types.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['Healthcare', 'Manufacturing', 'Call Centers'],
    },
    {
      id: '8h-2e-2l-2n-4off',
      label: '2 early / 2 late / 2 nights / 4 off',
      description: 'Balanced rotation across early, late and night shifts with extended recovery.',
      cycleLength: 10,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services', 'Manufacturing'],
    },
    {
      id: '8h-3e-3l-6off',
      label: '3 early / 3 late / 6 off',
      description: 'Longer blocks of early and late shifts with extended rest period.',
      cycleLength: 12,
      category: 'rotating',
      commonIn: ['Healthcare', 'Manufacturing'],
    },
    {
      id: '8h-2d-2n-4off',
      label: '2 days / 2 nights / 4 off',
      description: 'Alternating day and night shifts with equal recovery time between blocks.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services', 'Security'],
    },
    
    // Continental Patterns
    {
      id: '8h-continental-223',
      label: 'Continental 2–2–3',
      description: 'Two days on, two off, three days on, then two off. Repeats every 9 days.',
      cycleLength: 9,
      category: 'continental',
      commonIn: ['USA', 'Canada', 'Manufacturing', 'Healthcare'],
    },
    {
      id: '8h-continental-3223',
      label: 'Continental 3–2–2–3',
      description: 'Three on, two off, two on, three off. Provides every other weekend off.',
      cycleLength: 10,
      category: 'continental',
      commonIn: ['USA', 'Manufacturing', 'Healthcare'],
    },
    {
      id: '8h-continental-2332',
      label: 'Continental 2–3–3–2',
      description: 'Two on, three off, three on, two off. Balanced work and rest periods.',
      cycleLength: 10,
      category: 'continental',
      commonIn: ['USA', 'Manufacturing'],
    },
    
    // Panama Patterns
    {
      id: '8h-panama-223',
      label: 'Panama 2–2–3',
      description: 'Two days on, two off, three days on, then two off. Popular rotating pattern.',
      cycleLength: 9,
      category: 'panama',
      commonIn: ['USA', 'Canada', 'Healthcare', 'Emergency Services'],
    },
    
    // European Patterns
    {
      id: '8h-european-4team',
      label: 'European 4-team rotation',
      description: 'Four teams rotating through days, evenings, nights, and off. Common in Europe.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['UK', 'Germany', 'France', 'Healthcare', 'Manufacturing'],
    },
    {
      id: '8h-split-shift',
      label: 'Split shift pattern',
      description: 'Morning and evening shifts with long break in between. Common in hospitality.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Hospitality', 'Retail', 'Restaurants'],
    },
    
    // Custom
    {
      id: '8h-custom',
      label: 'Custom 8h pattern',
      description: 'Build your own 8h pattern to match your specific rota requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],

  '12h': [
    // Standard 12h Patterns
    {
      id: '12h-4on-4off',
      label: '4 on / 4 off',
      description: 'Very common 12h rota for emergency services, plant operations and security teams.',
      cycleLength: 8,
      category: 'standard',
      commonIn: ['UK', 'USA', 'Emergency Services', 'Security', 'Manufacturing'],
    },
    {
      id: '12h-2d-2n-4off',
      label: '2 days / 2 nights / 4 off',
      description: 'Two day shifts, two night shifts, then four days off. Excellent recovery time.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services', 'Security'],
    },
    {
      id: '12h-3on-3off',
      label: '3 on / 3 off',
      description: 'Simple 3 on / 3 off rhythm for 24/7 coverage. Easy to remember and plan around.',
      cycleLength: 6,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services', 'Manufacturing'],
    },
    {
      id: '12h-7on-7off',
      label: '7 on / 7 off',
      description: 'Intense block of seven long shifts followed by a full week off. Popular in remote work.',
      cycleLength: 14,
      category: 'rotating',
      commonIn: ['Oil & Gas', 'Mining', 'Remote Healthcare', 'Security'],
    },
    {
      id: '12h-5on-5off',
      label: '5 on / 5 off',
      description: 'Five consecutive 12h shifts followed by five days off. Good work-life balance.',
      cycleLength: 10,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services'],
    },
    
    // Panama Patterns
    {
      id: '12h-panama-223',
      label: 'Panama 2–2–3',
      description: 'Popular 2–2–3 pattern with every other weekend off. Very common in healthcare.',
      cycleLength: 7,
      category: 'panama',
      commonIn: ['USA', 'Canada', 'Healthcare', 'Emergency Services'],
    },
    {
      id: '12h-panama-223-rotating',
      label: 'Panama 2–2–3 · Rotating',
      description: 'Panama pattern rotating through days and nights. Every other weekend off.',
      cycleLength: 14,
      category: 'panama',
      commonIn: ['USA', 'Healthcare'],
    },
    
    // DuPont Patterns
    {
      id: '12h-du-pont',
      label: 'DuPont 12h',
      description: 'Continuous 24/7 DuPont rotation with regular long breaks. Very popular in manufacturing.',
      cycleLength: 28,
      category: 'dupont',
      commonIn: ['USA', 'Manufacturing', 'Chemical Industry'],
    },
    {
      id: '12h-du-pont-compressed',
      label: 'DuPont Compressed',
      description: 'Compressed DuPont schedule with shorter cycles. More frequent long breaks.',
      cycleLength: 21,
      category: 'dupont',
      commonIn: ['Manufacturing'],
    },
    
    // Continental Patterns
    {
      id: '12h-continental-223',
      label: 'Continental 2–2–3',
      description: 'Continental style rotation with a repeating 2–2–3 structure.',
      cycleLength: 7,
      category: 'continental',
      commonIn: ['USA', 'Manufacturing'],
    },
    {
      id: '12h-continental-3223',
      label: 'Continental 3–2–2–3',
      description: 'Three on, two off, two on, three off. Provides every other weekend off.',
      cycleLength: 10,
      category: 'continental',
      commonIn: ['USA', 'Manufacturing'],
    },
    
    // Specialized Patterns
    {
      id: '12h-2d-3off-2n-3off',
      label: '2 days / 3 off / 2 nights / 3 off',
      description: 'Separates day and night blocks with three-day recovery windows between.',
      cycleLength: 10,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services'],
    },
    {
      id: '12h-3d-3n-6off',
      label: '3 days / 3 nights / 6 off',
      description: 'Three day shifts, three night shifts, then six full days off. Excellent recovery.',
      cycleLength: 12,
      category: 'rotating',
      commonIn: ['Healthcare', 'Emergency Services'],
    },
    {
      id: '12h-4d-4n-8off',
      label: '4 days / 4 nights / 8 off',
      description: 'Longer blocks with extended recovery. Popular in remote or high-intensity roles.',
      cycleLength: 16,
      category: 'rotating',
      commonIn: ['Oil & Gas', 'Mining', 'Remote Healthcare'],
    },
    
    // European Patterns
    {
      id: '12h-european-4team',
      label: 'European 4-team rotation',
      description: 'Four teams rotating through days, nights, and off. Common in European healthcare.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['UK', 'Germany', 'France', 'Healthcare'],
    },
    
    // Custom
    {
      id: '12h-custom',
      label: 'Custom 12h pattern',
      description: 'Build your own 12h pattern to match your specific rota requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],

  '16h': [
    // Standard 16h Patterns
    {
      id: '16h-2on-2off',
      label: '2 on / 2 off',
      description: 'Long 16h shifts with equal time off for recovery. Very intense but balanced.',
      cycleLength: 4,
      category: 'standard',
      commonIn: ['Security', 'Emergency Services', 'Remote Work'],
    },
    {
      id: '16h-3on-3off',
      label: '3 on / 3 off',
      description: 'Three long shifts followed by three full days off. Demanding but with good recovery.',
      cycleLength: 6,
      category: 'rotating',
      commonIn: ['Security', 'Emergency Services'],
    },
    {
      id: '16h-4on-4off',
      label: '4 on / 4 off',
      description: 'Maximises long shifts with extended rest blocks. Very demanding pattern.',
      cycleLength: 8,
      category: 'rotating',
      commonIn: ['Security', 'Remote Work'],
    },
    {
      id: '16h-1on-2off',
      label: '1 on / 2 off',
      description: 'Occasional very long shifts with plenty of time off. Least demanding 16h pattern.',
      cycleLength: 3,
      category: 'rotating',
      commonIn: ['Security', 'Event Work'],
    },
    
    // Day/Night Rotations
    {
      id: '16h-2d-2off-2n-3off',
      label: '2 long days / 2 off / 2 long nights / 3 off',
      description: 'Split between long days and long nights with recovery between blocks.',
      cycleLength: 9,
      category: 'rotating',
      commonIn: ['Security', 'Emergency Services'],
    },
    {
      id: '16h-3d-3n-6off',
      label: '3 long days / 3 long nights / 6 off',
      description: 'Longer blocks of day and night shifts with extended recovery period.',
      cycleLength: 12,
      category: 'rotating',
      commonIn: ['Security', 'Remote Work'],
    },
    
    // Extended Patterns
    {
      id: '16h-7on-7off',
      label: '7 on / 7 off',
      description: 'Seven consecutive 16h shifts followed by a full week off. Very intense.',
      cycleLength: 14,
      category: 'rotating',
      commonIn: ['Remote Work', 'Oil & Gas', 'Mining'],
    },
    {
      id: '16h-14on-14off',
      label: '14 on / 14 off',
      description: 'Two weeks on, two weeks off. Common in remote or offshore work.',
      cycleLength: 28,
      category: 'rotating',
      commonIn: ['Oil & Gas', 'Mining', 'Offshore Work'],
    },
    
    // Custom
    {
      id: '16h-custom',
      label: 'Custom 16h pattern',
      description: 'Build your own 16h pattern for non-standard long shift requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],

  '6h': [
    // 6-Hour Shift Patterns (Part-time, Split Shifts)
    {
      id: '6h-split-shift',
      label: 'Split shift pattern',
      description: 'Two separate 6-hour shifts in a day with a break in between. Common in hospitality and public transport.',
      cycleLength: 1,
      category: 'standard',
      commonIn: ['Hospitality', 'Public Transport', 'Retail', 'Restaurants'],
    },
    {
      id: '6h-5on-2off',
      label: '5 on / 2 off',
      description: 'Five consecutive 6-hour shifts followed by two days off. Standard part-time workweek.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Hospitality', 'Healthcare (part-time)'],
    },
    {
      id: '6h-4on-3off',
      label: '4 on / 3 off',
      description: 'Four 6-hour shifts followed by three days off. Good balance for part-time workers.',
      cycleLength: 7,
      category: 'rotating',
      commonIn: ['Retail', 'Hospitality', 'Customer Service'],
    },
    {
      id: '6h-3on-4off',
      label: '3 on / 4 off',
      description: 'Three 6-hour shifts followed by four days off. Light part-time schedule with extended breaks.',
      cycleLength: 7,
      category: 'rotating',
      commonIn: ['Retail', 'Hospitality', 'Part-time Work'],
    },
    {
      id: '6h-morning-only',
      label: 'Morning shifts only',
      description: 'Regular morning 6-hour shifts, typically 6am-12pm or 7am-1pm. Consistent early schedule.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Hospitality', 'Cafes', 'Bakery'],
    },
    {
      id: '6h-evening-only',
      label: 'Evening shifts only',
      description: 'Regular evening 6-hour shifts, typically 4pm-10pm or 5pm-11pm. Consistent late schedule.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Hospitality', 'Restaurants', 'Entertainment'],
    },
    {
      id: '6h-rotating',
      label: 'Rotating 6h shifts',
      description: 'Rotating through morning, afternoon, and evening 6-hour shifts. Provides variety in schedule.',
      cycleLength: 7,
      category: 'rotating',
      commonIn: ['Retail', 'Hospitality', 'Customer Service'],
    },
    {
      id: '6h-custom',
      label: 'Custom 6h pattern',
      description: 'Build your own 6h pattern to match your specific rota requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],

  '4h': [
    // 4-Hour Shift Patterns (Micro Shifts, Twilight Shifts)
    {
      id: '4h-twilight-evening',
      label: 'Twilight / Evening shifts',
      description: 'Short evening shifts typically 5pm-9pm or 6pm-10pm. Common in retail and service industries.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Service Industry', 'Hospitality', 'Food Service'],
    },
    {
      id: '4h-split-shift',
      label: 'Split shift pattern',
      description: 'Two separate 4-hour shifts in a day with a break in between. Morning and evening coverage.',
      cycleLength: 1,
      category: 'standard',
      commonIn: ['Restaurants', 'Cafes', 'Public Transport', 'Hospitality'],
    },
    {
      id: '4h-morning-only',
      label: 'Morning shifts only',
      description: 'Regular morning 4-hour shifts, typically 6am-10am or 7am-11am. Early morning coverage.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Cafes', 'Bakery', 'Grocery Stores'],
    },
    {
      id: '4h-afternoon-only',
      label: 'Afternoon shifts only',
      description: 'Regular afternoon 4-hour shifts, typically 12pm-4pm or 1pm-5pm. Midday coverage.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Hospitality', 'Customer Service'],
    },
    {
      id: '4h-evening-only',
      label: 'Evening shifts only',
      description: 'Regular evening 4-hour shifts, typically 5pm-9pm or 6pm-10pm. Peak hours coverage.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Restaurants', 'Entertainment', 'Service Industry'],
    },
    {
      id: '4h-5on-2off',
      label: '5 on / 2 off',
      description: 'Five consecutive 4-hour shifts followed by two days off. Standard part-time micro-shift pattern.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Hospitality', 'Part-time Work'],
    },
    {
      id: '4h-rotating',
      label: 'Rotating 4h shifts',
      description: 'Rotating through different times of day. Provides flexibility and coverage across all hours.',
      cycleLength: 7,
      category: 'rotating',
      commonIn: ['Retail', 'Hospitality', 'Customer Service'],
    },
    {
      id: '4h-weekend-only',
      label: 'Weekend shifts only',
      description: '4-hour shifts on weekends only. Perfect for students or second job workers.',
      cycleLength: 7,
      category: 'standard',
      commonIn: ['Retail', 'Hospitality', 'Student Work'],
    },
    {
      id: '4h-custom',
      label: 'Custom 4h pattern',
      description: 'Build your own 4h pattern to match your specific rota requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],

  custom: [
    {
      id: 'custom-pattern',
      label: 'Create custom pattern',
      description: 'Design your own shift pattern to match your unique rota requirements.',
      cycleLength: 0,
      category: 'custom',
      commonIn: [],
    },
  ],
}

/**
 * Get all patterns for a specific shift length
 */
export function getPatternsByLength(length: ShiftLength): ShiftPattern[] {
  if (length === 'custom') {
    return COMPREHENSIVE_PATTERNS.custom
  }
  return COMPREHENSIVE_PATTERNS[length] || []
}

/**
 * Get a pattern by ID
 */
export function getPatternById(id: string): ShiftPattern | null {
  for (const patterns of Object.values(COMPREHENSIVE_PATTERNS)) {
    const pattern = patterns.find((p) => p.id === id)
    if (pattern) return pattern
  }
  return null
}

