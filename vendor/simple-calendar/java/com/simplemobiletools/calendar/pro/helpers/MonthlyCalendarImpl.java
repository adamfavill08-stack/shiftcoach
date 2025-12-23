package com.simplemobiletools.calendar.pro.helpers;

import android.content.Context;
import com.simplemobiletools.calendar.pro.interfaces.MonthlyCalendar;
import com.simplemobiletools.calendar.pro.models.DayMonthly;
import com.simplemobiletools.calendar.pro.models.Event;
import org.joda.time.DateTime;
import java.util.ArrayList;
import java.util.HashMap;

public class MonthlyCalendarImpl {
    private static final int DAYS_CNT = 42;
    private static final String YEAR_PATTERN = "YYYY";

    private final String mToday;
    private ArrayList<Event> mEvents = new ArrayList<>();
    private DateTime mTargetDate;
    private final MonthlyCalendar callback;
    private final Context context;

    public MonthlyCalendarImpl(MonthlyCalendar callback, Context context) {
        this.callback = callback;
        this.context = context;
        this.mToday = new DateTime().toString(Formatter.DAYCODE_PATTERN);
    }

    public void updateMonthlyCalendar(DateTime targetDate) {
        mTargetDate = targetDate;
        long startTS = mTargetDate.minusDays(7).getMillis() / 1000;
        long endTS = mTargetDate.plusDays(43).getMillis() / 1000;
        
        // Note: This requires EventsHelper - simplified for Java conversion
        // In the original Kotlin: context.eventsHelper.getEvents(startTS, endTS) { gotEvents(it) }
        // You would need to implement event fetching here
        // For now, we'll call getDays directly
        getDays(false);
    }

    public void getMonth(DateTime targetDate) {
        updateMonthlyCalendar(targetDate);
    }

    public void getDays(boolean markDaysWithEvents) {
        ArrayList<DayMonthly> days = new ArrayList<>(DAYS_CNT);
        DateTime firstDayOfMonth = mTargetDate.withDayOfMonth(1);
        
        // Get first day index in week (0 = Monday, 6 = Sunday)
        int firstDayIndex = getProperDayIndexInWeek(firstDayOfMonth);

        int currMonthDays = mTargetDate.dayOfMonth().getMaximumValue();
        int prevMonthDays = mTargetDate.minusMonths(1).dayOfMonth().getMaximumValue();

        boolean isThisMonth = false;
        boolean isToday;
        int value = prevMonthDays - firstDayIndex + 1;
        DateTime curDay = mTargetDate;

        for (int i = 0; i < DAYS_CNT; i++) {
            if (i < firstDayIndex) {
                isThisMonth = false;
                curDay = mTargetDate.withDayOfMonth(1).minusMonths(1);
            } else if (i == firstDayIndex) {
                value = 1;
                isThisMonth = true;
                curDay = mTargetDate;
            } else if (value == currMonthDays + 1) {
                value = 1;
                isThisMonth = false;
                curDay = mTargetDate.withDayOfMonth(1).plusMonths(1);
            }

            isToday = isToday(curDay, value);

            DateTime newDay = curDay.withDayOfMonth(value);
            String dayCode = Formatter.getDayCodeFromDateTime(newDay);
            boolean isWeekend = isWeekendIndex(i);
            
            DayMonthly day = new DayMonthly(
                value,
                isThisMonth,
                isToday,
                dayCode,
                newDay.getWeekOfWeekyear(),
                new ArrayList<>(),
                i,
                isWeekend
            );
            days.add(day);
            value++;
        }

        if (markDaysWithEvents) {
            markDaysWithEvents(days);
        } else {
            callback.updateMonthlyCalendar(context, getMonthName(), days, false, mTargetDate);
        }
    }

    private void markDaysWithEvents(ArrayList<DayMonthly> days) {
        HashMap<String, ArrayList<Event>> dayEvents = new HashMap<>();
        
        for (Event event : mEvents) {
            DateTime startDateTime = new DateTime(event.getStartTS() * 1000);
            DateTime endDateTime = new DateTime(event.getEndTS() * 1000);
            String endCode = Formatter.getDayCodeFromDateTime(endDateTime);

            DateTime currDay = startDateTime;
            String dayCode = Formatter.getDayCodeFromDateTime(currDay);
            ArrayList<Event> currDayEvents = dayEvents.getOrDefault(dayCode, new ArrayList<>());
            currDayEvents.add(event);
            dayEvents.put(dayCode, currDayEvents);

            while (!Formatter.getDayCodeFromDateTime(currDay).equals(endCode)) {
                currDay = currDay.plusDays(1);
                dayCode = Formatter.getDayCodeFromDateTime(currDay);
                currDayEvents = dayEvents.getOrDefault(dayCode, new ArrayList<>());
                currDayEvents.add(event);
                dayEvents.put(dayCode, currDayEvents);
            }
        }

        for (DayMonthly day : days) {
            if (dayEvents.containsKey(day.getCode())) {
                day.setDayEvents(dayEvents.get(day.getCode()));
            }
        }
        
        callback.updateMonthlyCalendar(context, getMonthName(), days, true, mTargetDate);
    }

    private boolean isToday(DateTime targetDate, int curDayInMonth) {
        int targetMonthDays = targetDate.dayOfMonth().getMaximumValue();
        int dayToCheck = Math.min(curDayInMonth, targetMonthDays);
        return targetDate.withDayOfMonth(dayToCheck).toString(Formatter.DAYCODE_PATTERN).equals(mToday);
    }

    private String getMonthName() {
        String month = Formatter.getMonthName(context, mTargetDate.getMonthOfYear());
        String targetYear = mTargetDate.toString(YEAR_PATTERN);
        if (!targetYear.equals(new DateTime().toString(YEAR_PATTERN))) {
            month += " " + targetYear;
        }
        return month;
    }

    private void gotEvents(ArrayList<Event> events) {
        mEvents = events;
        getDays(true);
    }

    // Helper methods (these would normally be extension functions in Kotlin)
    private int getProperDayIndexInWeek(DateTime dateTime) {
        // Convert Joda day of week (1=Monday, 7=Sunday) to index (0=Monday, 6=Sunday)
        int dayOfWeek = dateTime.getDayOfWeek();
        return dayOfWeek == 7 ? 6 : dayOfWeek - 1;
    }

    private boolean isWeekendIndex(int index) {
        // Check if the index represents a weekend day (Saturday or Sunday)
        int dayOfWeek = (index % 7) + 1; // Convert index to day of week (1-7)
        return dayOfWeek == 6 || dayOfWeek == 7; // Saturday or Sunday
    }
}

