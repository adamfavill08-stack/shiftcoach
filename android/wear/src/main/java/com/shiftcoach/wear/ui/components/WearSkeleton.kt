package com.shiftcoach.wear.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import com.shiftcoach.wear.theme.WearColors
import androidx.compose.ui.unit.Dp
import com.shiftcoach.wear.theme.WearRadius
import com.shiftcoach.wear.theme.WearSizes
import com.shiftcoach.wear.theme.WearSpacing

@Composable
fun Modifier.shimmerBrush(): Modifier {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val shift by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerShift",
    )
    val brush = Brush.linearGradient(
        colors = listOf(
            WearColors.skeletonBase,
            WearColors.skeletonHighlight.copy(alpha = 0.55f),
            WearColors.skeletonBase,
        ),
        start = Offset(shift, 0f),
        end = Offset(shift + 180f, 120f),
    )
    return this.background(brush)
}

@Composable
fun SkeletonLine(
    modifier: Modifier = Modifier,
    height: Dp = WearSpacing.sm,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(WearRadius.chip))
            .shimmerBrush(),
    )
}

@Composable
fun HeroBodyclockSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(WearSpacing.md),
    ) {
        Box(
            modifier = Modifier.size(WearSizes.bodyclockRing),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape)
                    .background(WearColors.surfaceCard),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(WearSizes.bodyclockStroke)
                    .clip(CircleShape)
                    .shimmerBrush(),
            )
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = WearSpacing.lg),
            verticalArrangement = Arrangement.spacedBy(WearSpacing.xs),
        ) {
            SkeletonLine(modifier = Modifier.fillMaxWidth(0.72f), height = WearSpacing.sm)
            SkeletonLine(modifier = Modifier.fillMaxWidth(0.55f), height = WearSpacing.xs)
        }
    }
}

@Composable
fun StatChipSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(WearRadius.chip))
            .background(WearColors.surface2)
            .padding(
                horizontal = WearSpacing.chipPaddingHorizontal,
                vertical = WearSpacing.chipPaddingVertical,
            ),
        verticalArrangement = Arrangement.spacedBy(WearSpacing.sm),
    ) {
        SkeletonLine(modifier = Modifier.fillMaxWidth(0.45f), height = WearSpacing.xs)
        SkeletonLine(modifier = Modifier.fillMaxWidth(0.85f), height = WearSpacing.md)
    }
}

@Composable
internal fun StatColumnSkeleton(showProgress: Boolean, modifier: Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(WearSpacing.xs),
    ) {
        SkeletonLine(modifier = Modifier.fillMaxWidth(0.5f), height = WearSpacing.xs)
        SkeletonLine(modifier = Modifier.fillMaxWidth(0.7f), height = WearSpacing.md)
        if (showProgress) {
            SkeletonLine(modifier = Modifier.fillMaxWidth(), height = WearSizes.progressHeight)
        }
    }
}
