package com.shiftcoach.wear.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.shiftcoach.wear.theme.WearMotion
import kotlinx.coroutines.delay

/**
 * Soft staggered entry on first composition after [loadKey] changes (e.g. refresh).
 */
@Composable
fun WearSectionEnter(
    sectionIndex: Int,
    loadKey: Int,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    var visible by remember(loadKey) { mutableStateOf(false) }
    LaunchedEffect(loadKey, sectionIndex) {
        visible = false
        delay(sectionIndex * WearMotion.sectionStaggerMs.toLong())
        visible = true
    }
    AnimatedVisibility(
        visible = visible,
        modifier = modifier.fillMaxWidth(),
        enter = fadeIn(
            animationSpec = tween(
                durationMillis = WearMotion.contentFadeMs,
                easing = FastOutSlowInEasing,
            ),
        ) + slideInVertically(
            animationSpec = tween(
                durationMillis = WearMotion.contentFadeMs,
                easing = FastOutSlowInEasing,
            ),
            initialOffsetY = { it / 12 },
        ),
        exit = fadeOut(animationSpec = tween(120)),
    ) {
        content()
    }
}
