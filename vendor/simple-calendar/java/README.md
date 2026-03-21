# Simple Calendar - Java Conversion

This directory contains Java equivalents of the key Kotlin files from Simple Calendar Pro.

## Converted Files

### Core Models
- **DayMonthly.java** - Data class representing a day in the monthly calendar view
- **Event.java** - Simplified event model (you may need to add more fields from the original)

### Helpers
- **Constants.java** - All constants and utility functions
- **Formatter.java** - Date/time formatting utilities
- **MonthlyCalendarImpl.java** - Main calendar logic for building month views

### Interfaces
- **MonthlyCalendar.java** - Interface for calendar callbacks

## Key Differences from Kotlin

1. **Data Classes** → Regular classes with getters/setters
2. **Extension Functions** → Static utility methods or instance methods
3. **Nullable Types** → Use `@Nullable` annotations or Optional
4. **Default Parameters** → Method overloading
5. **Companion Objects** → Static methods/fields
6. **Lambda Expressions** → Functional interfaces or anonymous classes

## Usage Notes

- These are simplified conversions focusing on the core calendar logic
- You may need to add additional fields/methods based on your needs
- The `Formatter` class needs proper Android resource localization
- `EventsHelper` integration is simplified - you'll need to implement the actual event fetching

## Dependencies

- Joda Time library (for date manipulation)
- Android SDK

## Next Steps

1. Add missing fields to `Event.java` based on your requirements
2. Implement proper localization in `Formatter.getMonthName()`
3. Integrate with your event data source
4. Add error handling and edge cases

