package com.simplemobiletools.calendar.pro.helpers;

import android.content.Context;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;

public class Formatter {
    public static final String DAYCODE_PATTERN = "YYYYMMdd";
    public static final String YEAR_PATTERN = "YYYY";
    private static final String TIME_PATTERN = "HHmmss";
    private static final String MONTH_PATTERN = "MMM";
    private static final String DAY_PATTERN = "d";
    private static final String DAY_OF_WEEK_PATTERN = "EEE";

    public static String getDayCodeFromDateTime(DateTime dateTime) {
        return dateTime.toString(DAYCODE_PATTERN);
    }

    public static DateTime getDateTimeFromCode(String dayCode) {
        return DateTimeFormat.forPattern(DAYCODE_PATTERN)
                .withZone(DateTimeZone.UTC)
                .parseDateTime(dayCode);
    }

    public static DateTime getDateTimeFromTS(long ts) {
        return new DateTime(ts * 1000);
    }

    public static String getMonthName(Context context, int monthIndex) {
        // This would typically use Android's DateFormat or resources
        // Simplified version - you'd need to implement proper localization
        String[] monthNames = {
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        };
        if (monthIndex >= 1 && monthIndex <= 12) {
            return monthNames[monthIndex - 1];
        }
        return "";
    }

    public static long getNowSeconds() {
        return System.currentTimeMillis() / 1000L;
    }
}

