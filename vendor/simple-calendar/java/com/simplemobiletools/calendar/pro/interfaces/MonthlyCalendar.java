package com.simplemobiletools.calendar.pro.interfaces;

import android.content.Context;
import com.simplemobiletools.calendar.pro.models.DayMonthly;
import org.joda.time.DateTime;
import java.util.ArrayList;

public interface MonthlyCalendar {
    void updateMonthlyCalendar(Context context, String month, ArrayList<DayMonthly> days,
                               boolean checkedEvents, DateTime currTargetDate);
}

