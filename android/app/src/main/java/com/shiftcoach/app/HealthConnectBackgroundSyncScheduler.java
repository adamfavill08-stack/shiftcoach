package com.shiftcoach.app;

import android.content.Context;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

public final class HealthConnectBackgroundSyncScheduler {
    private static final String PERIODIC_WORK_NAME = "health_connect_periodic_sync";
    private static final String ONE_TIME_WORK_NAME = "health_connect_resume_sync";

    private HealthConnectBackgroundSyncScheduler() {}

    public static void ensurePeriodicSync(Context context) {
        Constraints constraints =
                new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest periodic =
                new PeriodicWorkRequest.Builder(HealthConnectSyncWorker.class, 4, TimeUnit.HOURS)
                        .setConstraints(constraints)
                        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.MINUTES)
                        .build();
        WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                        PERIODIC_WORK_NAME,
                        ExistingPeriodicWorkPolicy.UPDATE,
                        periodic);
    }

    public static void enqueueOpenOrResumeSync(Context context) {
        Constraints constraints =
                new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        OneTimeWorkRequest oneTime =
                new OneTimeWorkRequest.Builder(HealthConnectSyncWorker.class)
                        .setConstraints(constraints)
                        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.MINUTES)
                        .build();
        WorkManager.getInstance(context)
                .enqueueUniqueWork(ONE_TIME_WORK_NAME, ExistingWorkPolicy.KEEP, oneTime);
    }
}
