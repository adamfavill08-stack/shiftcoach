package com.simplemobiletools.calendar.pro.models;

import java.util.ArrayList;

public class DayMonthly {
    private final int value;
    private final boolean isThisMonth;
    private final boolean isToday;
    private final String code;
    private final int weekOfYear;
    private ArrayList<Event> dayEvents;
    private int indexOnMonthView;
    private final boolean isWeekend;

    public DayMonthly(int value, boolean isThisMonth, boolean isToday, String code,
                     int weekOfYear, ArrayList<Event> dayEvents, int indexOnMonthView,
                     boolean isWeekend) {
        this.value = value;
        this.isThisMonth = isThisMonth;
        this.isToday = isToday;
        this.code = code;
        this.weekOfYear = weekOfYear;
        this.dayEvents = dayEvents != null ? dayEvents : new ArrayList<>();
        this.indexOnMonthView = indexOnMonthView;
        this.isWeekend = isWeekend;
    }

    // Getters
    public int getValue() {
        return value;
    }

    public boolean isThisMonth() {
        return isThisMonth;
    }

    public boolean isToday() {
        return isToday;
    }

    public String getCode() {
        return code;
    }

    public int getWeekOfYear() {
        return weekOfYear;
    }

    public ArrayList<Event> getDayEvents() {
        return dayEvents;
    }

    public int getIndexOnMonthView() {
        return indexOnMonthView;
    }

    public boolean isWeekend() {
        return isWeekend;
    }

    // Setters (for mutable fields)
    public void setDayEvents(ArrayList<Event> dayEvents) {
        this.dayEvents = dayEvents;
    }

    public void setIndexOnMonthView(int indexOnMonthView) {
        this.indexOnMonthView = indexOnMonthView;
    }
}

