package com.shiftcoach.wear.theme

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween

object WearMotion {
    /** Hero ring fill — slower, eases into place. */
    val ringDurationMs = 1480
    val ringDelayMs = 140
    val ringEasing = FastOutSlowInEasing

    val contentFadeMs = 520
    val contentFadeShortMs = 340
    val valueCrossfadeMs = 380

    /** Stagger between stacked sections on load / refresh. */
    val sectionStaggerMs = 95
}
