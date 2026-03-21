package com.shiftcoach.wear;

import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONException;
import org.json.JSONObject;
import android.util.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "ShiftCoachWear";

    // For local development, your Android emulator can typically reach the host via 10.0.2.2.
    // If needed for production, change this to your real domain.
    private static final String API_BASE_URL = "http://10.0.2.2:3000";

    private TextView stepsValue;
    private TextView activeMinutesValue;

    private TextView sleepLastNightHoursValue;
    private TextView sleepQualityValue;

    private TextView restingBpmValue;
    private TextView avgBpmValue;

    private TextView bodyclockScoreValue;
    private TextView bingeRiskValue;
    private TextView shiftLagValue;
    private TextView nextMealValue;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        stepsValue = findViewById(R.id.steps_value);
        activeMinutesValue = findViewById(R.id.active_minutes_value);

        sleepLastNightHoursValue = findViewById(R.id.sleep_last_night_hours_value);
        sleepQualityValue = findViewById(R.id.sleep_quality_value);

        restingBpmValue = findViewById(R.id.resting_bpm_value);
        avgBpmValue = findViewById(R.id.avg_bpm_value);

        bodyclockScoreValue = findViewById(R.id.bodyclock_score_value);
        bingeRiskValue = findViewById(R.id.binge_risk_value);
        shiftLagValue = findViewById(R.id.shift_lag_value);
        nextMealValue = findViewById(R.id.next_meal_value);

        setLoading();
        loadAllCardsAsync();
    }

    private void setLoading() {
        stepsValue.setText(getString(R.string.label_loading));
        activeMinutesValue.setText(getString(R.string.label_loading));
        sleepLastNightHoursValue.setText(getString(R.string.label_loading));
        sleepQualityValue.setText("Quality: " + getString(R.string.label_loading));
        restingBpmValue.setText(getString(R.string.label_loading));
        avgBpmValue.setText(getString(R.string.label_loading));
        bodyclockScoreValue.setText(getString(R.string.label_loading));
        bingeRiskValue.setText(getString(R.string.label_loading));
        shiftLagValue.setText(getString(R.string.label_loading));
        nextMealValue.setText(getString(R.string.label_loading));
    }

    private void loadAllCardsAsync() {
        new Thread(() -> {
            try {
                JSONObject activity = getJson(API_BASE_URL + "/api/activity/today");
                JSONObject activityObj = activity.optJSONObject("activity");
                if (activityObj != null) {
                    int steps = activityObj.optInt("steps", 0);
                    Integer activeMinutes = activityObj.has("activeMinutes")
                            ? activityObj.optInt("activeMinutes", 0)
                            : activityObj.has("active_minutes") ? activityObj.optInt("active_minutes", 0) : null;

                    runOnUiThread(() -> {
                        stepsValue.setText(steps == 0 ? getString(R.string.label_unknown) : String.valueOf(steps));
                        activeMinutesValue.setText(activeMinutes == null ? getString(R.string.label_unknown) : String.valueOf(activeMinutes));
                    });
                }
                Log.d(TAG, "Loaded Activity OK");
            } catch (Exception e) {
                Log.e(TAG, "Activity load failed: " + e.getMessage(), e);
                runOnUiThread(() -> stepsValue.setText(getString(R.string.label_error)));
                runOnUiThread(() -> activeMinutesValue.setText(getString(R.string.label_error)));
            }

            try {
                JSONObject sleepOverview = getJson(API_BASE_URL + "/api/sleep/overview");
                JSONObject metrics = sleepOverview.optJSONObject("metrics");
                int bodyclock = metrics != null ? metrics.optInt("bodyClockScore", 0) : 0;

                JSONObject sleepData = sleepOverview.optJSONObject("sleepData");
                JSONObject lastNight = sleepData != null ? sleepData.optJSONObject("lastNight") : null;
                int totalMinutes = lastNight != null ? lastNight.optInt("totalMinutes", 0) : 0;
                String quality = lastNight != null ? lastNight.optString("quality", null) : null;

                final int hours = totalMinutes > 0 ? totalMinutes / 60 : 0;
                final int mins = totalMinutes > 0 ? totalMinutes % 60 : 0;
                final String sleepText = totalMinutes > 0 ? (hours + "h " + mins + "m") : null;
                final String qualityText = quality != null && !quality.equals("") ? quality : null;

                runOnUiThread(() -> {
                    bodyclockScoreValue.setText(bodyclock > 0 ? String.valueOf(bodyclock) : getString(R.string.label_unknown));
                    sleepLastNightHoursValue.setText(sleepText != null ? sleepText : getString(R.string.label_unknown));
                    sleepQualityValue.setText("Quality: " + (qualityText != null ? qualityText : getString(R.string.label_unknown)));
                });
                Log.d(TAG, "Loaded Sleep OK");
            } catch (Exception ignored) {
                Log.e(TAG, "Sleep load failed: " + ignored.getMessage(), ignored);
                runOnUiThread(() -> sleepLastNightHoursValue.setText(getString(R.string.label_error)));
            }

            try {
                JSONObject engine = getJson(API_BASE_URL + "/api/engine/today");
                String bingeRisk = engine.optString("binge_risk", null);
                runOnUiThread(() -> {
                    bingeRiskValue.setText(bingeRisk != null && !bingeRisk.isEmpty() ? bingeRisk : getString(R.string.label_unknown));
                });
                Log.d(TAG, "Loaded Engine OK");
            } catch (Exception ignored) {
                Log.e(TAG, "Engine load failed: " + ignored.getMessage(), ignored);
                runOnUiThread(() -> bingeRiskValue.setText(getString(R.string.label_error)));
            }

            try {
                JSONObject shiftLag = getJson(API_BASE_URL + "/api/shiftlag");
                double score = shiftLag.optDouble("score", 0);
                String level = shiftLag.optString("level", null);
                runOnUiThread(() -> {
                    shiftLagValue.setText(score > 0 ? (String.valueOf(Math.round(score)) + (level != null ? " (" + level + ")" : "")) : getString(R.string.label_unknown));
                });
                Log.d(TAG, "Loaded ShiftLag OK");
            } catch (Exception ignored) {
                Log.e(TAG, "ShiftLag load failed: " + ignored.getMessage(), ignored);
                runOnUiThread(() -> shiftLagValue.setText(getString(R.string.label_error)));
            }

            try {
                JSONObject meal = getJson(API_BASE_URL + "/api/meal-timing/today");
                String label = meal.optString("nextMealLabel", null);
                String time = meal.optString("nextMealTime", null);
                runOnUiThread(() -> nextMealValue.setText(label != null && time != null ? (label + " · " + time) : getString(R.string.label_unknown)));
            } catch (Exception ignored) {
                Log.e(TAG, "Meal load failed: " + ignored.getMessage(), ignored);
                runOnUiThread(() -> nextMealValue.setText(getString(R.string.label_error)));
            }

            try {
                JSONObject hr = getJson(API_BASE_URL + "/api/google-fit/heart-rate");
                int resting = hr.optInt("resting_bpm", 0);
                int avg = hr.optInt("avg_bpm", 0);
                runOnUiThread(() -> {
                    restingBpmValue.setText(resting > 0 ? String.valueOf(resting) : getString(R.string.label_unknown));
                    avgBpmValue.setText(avg > 0 ? String.valueOf(avg) : getString(R.string.label_unknown));
                });
                Log.d(TAG, "Loaded HeartRate OK");
            } catch (Exception ignored) {
                Log.e(TAG, "HeartRate load failed: " + ignored.getMessage(), ignored);
                runOnUiThread(() -> restingBpmValue.setText(getString(R.string.label_error)));
                runOnUiThread(() -> avgBpmValue.setText(getString(R.string.label_error)));
            }

        }).start();
    }

    private JSONObject getJson(String urlString) throws IOException, JSONException {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(6000);
            connection.setReadTimeout(8000);
            connection.setRequestMethod("GET");

            int code = connection.getResponseCode();
            InputStream is = code >= 200 && code < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream();

            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }

            return new JSONObject(sb.toString());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}

