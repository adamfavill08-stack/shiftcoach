package com.shiftcoach.wear.model

/**
 * Dashboard state for the Wear app. Sections update independently as HTTP
 * responses arrive; [lastUpdatedMs] is set when the load pass completes.
 */
data class WearUiState(
    val activityError: Boolean = false,
    val sleepError: Boolean = false,
    val engineError: Boolean = false,
    val shiftLagError: Boolean = false,
    val mealError: Boolean = false,
    val heartRateError: Boolean = false,

    val steps: Int? = null,
    val activeMinutes: Int? = null,

    val sleepLastNightText: String? = null,
    val sleepQualityText: String? = null,
    val sleepTotalMinutes: Int? = null,

    val restingBpm: Int? = null,
    val avgBpm: Int? = null,

    val bodyclockScore: Int? = null,
    val bingeRisk: String? = null,

    val shiftLagText: String? = null,
    val shiftLagScore: Double? = null,
    val nextMealText: String? = null,
    /** ISO timestamp for next meal when API provides it (for relative copy). */
    val nextMealAtIso: String? = null,
    /** Meal-timing `cardSubtitle` before merged into [readinessInsightSecondary]. */
    val mealCardSubtitle: String? = null,

    /** Editorial lines under hero; finalized after all sections load. */
    val readinessInsightPrimary: String? = null,
    val readinessInsightSecondary: String? = null,

    /** Shift / schedule context (e.g. shift label from meal-timing). */
    val shiftPhaseLabel: String? = null,

    val loadPassFinished: Boolean = false,
    val lastUpdatedMs: Long? = null,

    /** Every section failed (e.g. offline / 401) — show one calm offline layout. */
    val globalLoadFailure: Boolean = false,
)
