package com.simplemobiletools.calendar.pro.helpers;

import org.joda.time.DateTime;
import org.joda.time.DateTimeConstants;

import java.util.Calendar;
import java.util.UUID;

public class Constants {
    // Calendar grid constants
    public static final int ROW_COUNT = 6;
    public static final int COLUMN_COUNT = 7;
    public static final int DAYS_CNT = ROW_COUNT * COLUMN_COUNT; // 42 days

    // Time constants
    public static final int TWELVE_HOURS = 43200;
    public static final int DAY = 86400;
    public static final int WEEK = 604800;
    public static final int MONTH = 2592001;
    public static final int YEAR = 31536000;

    // View types
    public static final int MONTHLY_VIEW = 1;
    public static final int YEARLY_VIEW = 2;
    public static final int EVENTS_LIST_VIEW = 3;
    public static final int WEEKLY_VIEW = 4;
    public static final int DAILY_VIEW = 5;
    public static final int LAST_VIEW = 6;
    public static final int MONTHLY_DAILY_VIEW = 7;

    // Event types
    public static final int OTHER_EVENT = 0;
    public static final int BIRTHDAY_EVENT = 1;
    public static final int ANNIVERSARY_EVENT = 2;
    public static final int HOLIDAY_EVENT = 3;

    // Item types
    public static final int ITEM_EVENT = 0;
    public static final int ITEM_SECTION_DAY = 1;
    public static final int ITEM_SECTION_MONTH = 2;

    // Reminder constants
    public static final int REMINDER_OFF = -1;
    public static final String REMINDER_DEFAULT_VALUE = REMINDER_OFF + "," + REMINDER_OFF + "," + REMINDER_OFF;

    // Repeat rules
    public static final int REPEAT_SAME_DAY = 1;
    public static final int REPEAT_ORDER_WEEKDAY_USE_LAST = 2;
    public static final int REPEAT_LAST_DAY = 3;
    public static final int REPEAT_ORDER_WEEKDAY = 4;

    // Event flags
    public static final int FLAG_ALL_DAY = 1;
    public static final int FLAG_IS_IN_PAST = 2;
    public static final int FLAG_MISSING_YEAR = 4;
    public static final int FLAG_TASK_COMPLETED = 8;

    // Utility methods
    public static long getNowSeconds() {
        return System.currentTimeMillis() / 1000L;
    }

    public static boolean isWeekend(int dayOfWeek) {
        return dayOfWeek == DateTimeConstants.SATURDAY || dayOfWeek == DateTimeConstants.SUNDAY;
    }

    public static int getJodaDayOfWeekFromJava(int dayOfWeek) {
        switch (dayOfWeek) {
            case Calendar.SUNDAY:
                return DateTimeConstants.SUNDAY;
            case Calendar.MONDAY:
                return DateTimeConstants.MONDAY;
            case Calendar.TUESDAY:
                return DateTimeConstants.TUESDAY;
            case Calendar.WEDNESDAY:
                return DateTimeConstants.WEDNESDAY;
            case Calendar.THURSDAY:
                return DateTimeConstants.THURSDAY;
            case Calendar.FRIDAY:
                return DateTimeConstants.FRIDAY;
            case Calendar.SATURDAY:
                return DateTimeConstants.SATURDAY;
            default:
                throw new IllegalArgumentException("Invalid day: " + dayOfWeek);
        }
    }

    public static int getJavaDayOfWeekFromJoda(int dayOfWeek) {
        switch (dayOfWeek) {
            case DateTimeConstants.SUNDAY:
                return Calendar.SUNDAY;
            case DateTimeConstants.MONDAY:
                return Calendar.MONDAY;
            case DateTimeConstants.TUESDAY:
                return Calendar.TUESDAY;
            case DateTimeConstants.WEDNESDAY:
                return Calendar.WEDNESDAY;
            case DateTimeConstants.THURSDAY:
                return Calendar.THURSDAY;
            case DateTimeConstants.FRIDAY:
                return Calendar.FRIDAY;
            case DateTimeConstants.SATURDAY:
                return Calendar.SATURDAY;
            default:
                throw new IllegalArgumentException("Invalid day: " + dayOfWeek);
        }
    }

    public static String generateImportId() {
        return UUID.randomUUID().toString().replace("-", "") + System.currentTimeMillis();
    }
}

