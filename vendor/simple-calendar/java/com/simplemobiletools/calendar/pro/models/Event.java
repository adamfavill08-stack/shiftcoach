package com.simplemobiletools.calendar.pro.models;

// Simplified Event model - you'll need to add all fields from the original
public class Event {
    private Long id;
    private String title;
    private long startTS;
    private long endTS;
    private int color;
    private long repeatInterval;
    private long repeatLimit;
    private int repeatRule;

    public Event() {
    }

    public Event(Long id, String title, long startTS, long endTS, int color) {
        this.id = id;
        this.title = title;
        this.startTS = startTS;
        this.endTS = endTS;
        this.color = color;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public long getStartTS() {
        return startTS;
    }

    public void setStartTS(long startTS) {
        this.startTS = startTS;
    }

    public long getEndTS() {
        return endTS;
    }

    public void setEndTS(long endTS) {
        this.endTS = endTS;
    }

    public int getColor() {
        return color;
    }

    public void setColor(int color) {
        this.color = color;
    }

    public long getRepeatInterval() {
        return repeatInterval;
    }

    public void setRepeatInterval(long repeatInterval) {
        this.repeatInterval = repeatInterval;
    }

    public long getRepeatLimit() {
        return repeatLimit;
    }

    public void setRepeatLimit(long repeatLimit) {
        this.repeatLimit = repeatLimit;
    }

    public int getRepeatRule() {
        return repeatRule;
    }

    public void setRepeatRule(int repeatRule) {
        this.repeatRule = repeatRule;
    }
}

