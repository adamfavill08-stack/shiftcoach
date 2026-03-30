package com.shiftcoach.wear.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import com.shiftcoach.wear.theme.WearColors
import com.shiftcoach.wear.theme.WearMotion
import com.shiftcoach.wear.theme.WearSizes
import com.shiftcoach.wear.theme.WearSpacing
import com.shiftcoach.wear.theme.WearTypography
import java.util.Locale

@Composable
fun BodyclockHero(
    scoreText: String,
    progress: Float?,
    isLoading: Boolean,
    isError: Boolean,
    /** True when [scoreText] is the numeric bodyclock value (accent). */
    scoreIsNumeric: Boolean,
    primaryInsight: String?,
    secondaryInsight: String?,
    phaseLabel: String?,
    modifier: Modifier = Modifier,
) {
    val targetProgress = when {
        isError -> 0f
        isLoading -> 0f
        else -> (progress ?: 0f).coerceIn(0f, 1f)
    }
    val animatedProgress by animateFloatAsState(
        targetValue = targetProgress,
        animationSpec = tween(
            durationMillis = WearMotion.ringDurationMs,
            delayMillis = WearMotion.ringDelayMs,
            easing = WearMotion.ringEasing,
        ),
        label = "bodyclockRing",
    )

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(WearSpacing.sm),
    ) {
        Crossfade(
            targetState = isLoading,
            animationSpec = tween(420, easing = FastOutSlowInEasing),
            label = "heroLoadCrossfade",
        ) { loading ->
            if (loading) {
                HeroBodyclockSkeleton()
            } else {
                HeroLoadedColumn(
                    phaseLabel = phaseLabel,
                    animatedProgress = animatedProgress,
                    isError = isError,
                    scoreText = scoreText,
                    scoreIsNumeric = scoreIsNumeric,
                    primaryInsight = primaryInsight,
                    secondaryInsight = secondaryInsight,
                )
            }
        }
    }
}

@Composable
private fun HeroLoadedColumn(
    phaseLabel: String?,
    animatedProgress: Float,
    isError: Boolean,
    scoreText: String,
    scoreIsNumeric: Boolean,
    primaryInsight: String?,
    secondaryInsight: String?,
) {
    val scoreColor = when {
        isError -> WearColors.low
        scoreIsNumeric -> WearColors.accentPrimary
        else -> WearColors.textSecondary
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(WearSpacing.sm),
    ) {
        phaseLabel?.takeIf { it.isNotBlank() }?.let { phase ->
            Text(
                text = phase.uppercase(Locale.US),
                style = WearTypography.phaseLabel,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(WearSizes.bodyclockRing)) {
            CircularProgressIndicator(
                progress = { animatedProgress },
                modifier = Modifier.size(WearSizes.bodyclockRing),
                color = if (isError) WearColors.low else WearColors.accentPrimary,
                trackColor = if (isError) WearColors.low.copy(alpha = 0.15f) else WearColors.trackMuted,
                strokeWidth = WearSizes.bodyclockStroke,
            )
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = WearSpacing.heroScorePadding),
            ) {
                AnimatedContent(
                    targetState = scoreText,
                    transitionSpec = {
                        fadeIn(tween(WearMotion.valueCrossfadeMs, easing = FastOutSlowInEasing)) togetherWith
                            fadeOut(tween(220))
                    },
                    label = "heroScore",
                ) { text ->
                    Text(
                        text = text,
                        style = WearTypography.heroScore.copy(color = scoreColor),
                        maxLines = 1,
                    )
                }
                Text(
                    text = "/100",
                    style = WearTypography.heroScoreSuffix,
                    maxLines = 1,
                )
            }
        }

        val hasInsight = !primaryInsight.isNullOrBlank() || !secondaryInsight.isNullOrBlank()
        AnimatedVisibility(
            visible = hasInsight,
            enter = fadeIn(tween(WearMotion.contentFadeShortMs, easing = FastOutSlowInEasing)),
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(WearSpacing.xs),
            ) {
                primaryInsight?.takeIf { it.isNotBlank() }?.let { line ->
                    Text(
                        text = line,
                        style = WearTypography.heroInsight,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = WearSpacing.md),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                secondaryInsight?.takeIf { it.isNotBlank() }?.let { line ->
                    Text(
                        text = line,
                        style = WearTypography.heroInsightQuiet,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = WearSpacing.md),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(WearSpacing.xs))
    }
}
