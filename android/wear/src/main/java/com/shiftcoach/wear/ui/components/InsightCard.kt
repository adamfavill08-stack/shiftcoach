package com.shiftcoach.wear.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shiftcoach.wear.theme.WearColors
import com.shiftcoach.wear.theme.WearRadius
import com.shiftcoach.wear.theme.WearSizes
import com.shiftcoach.wear.theme.WearSpacing
import com.shiftcoach.wear.theme.WearTypography

/**
 * Calm, non-interactive surface. Subtle stroke for depth — not a tappable Wear chip.
 */
@Composable
fun NonInteractiveCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(WearRadius.card))
            .background(WearColors.surfaceCard)
            .border(1.dp, WearColors.cardStroke, RoundedCornerShape(WearRadius.card))
            .padding(
                horizontal = WearSpacing.cardPaddingHorizontal,
                vertical = WearSpacing.cardPaddingVertical,
            ),
    ) {
        content()
    }
}

@Composable
fun SupportSectionLabel(text: String) {
    Text(
        text = text.uppercase(),
        style = WearTypography.phaseLabel.copy(
            color = WearColors.textSecondary.copy(alpha = 0.78f),
            letterSpacing = 0.45.sp,
        ),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier.padding(bottom = WearSpacing.sm),
    )
}

@Composable
fun InsightValueBlock(
    icon: ImageVector,
    label: String,
    value: String,
    progress: Float?,
    isLoading: Boolean = false,
    modifier: Modifier = Modifier,
) {
    if (isLoading) {
        Column(
            modifier = modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(WearSpacing.sm),
        ) {
            SkeletonLine(modifier = Modifier.fillMaxWidth(0.35f), height = WearSpacing.xs)
            SkeletonLine(modifier = Modifier.fillMaxWidth(0.92f), height = WearSpacing.md)
            if (progress != null) {
                SkeletonLine(
                    modifier = Modifier.fillMaxWidth(),
                    height = WearSizes.progressHeight,
                )
            }
        }
    } else {
        CompactStatColumn(
            modifier = modifier.fillMaxWidth(),
            icon = icon,
            label = label,
            value = value,
            progress = progress,
        )
    }
}

@Composable
fun CompactTwoStatRow(
    leftLabel: String,
    leftIcon: ImageVector,
    leftValue: String,
    rightLabel: String,
    rightIcon: ImageVector,
    rightValue: String,
    leftProgress: Float?,
    rightProgress: Float?,
    isLeftLoading: Boolean = false,
    isRightLoading: Boolean = false,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(WearSpacing.sm),
        verticalAlignment = Alignment.Top,
    ) {
        if (isLeftLoading) {
            StatColumnSkeleton(showProgress = leftProgress != null, Modifier.weight(1f))
        } else {
            CompactStatColumn(
                modifier = Modifier.weight(1f),
                icon = leftIcon,
                label = leftLabel,
                value = leftValue,
                progress = leftProgress,
            )
        }
        if (isRightLoading) {
            StatColumnSkeleton(showProgress = rightProgress != null, Modifier.weight(1f))
        } else {
            CompactStatColumn(
                modifier = Modifier.weight(1f),
                icon = rightIcon,
                label = rightLabel,
                value = rightValue,
                progress = rightProgress,
            )
        }
    }
}

@Composable
private fun CompactStatColumn(
    modifier: Modifier,
    icon: ImageVector,
    label: String,
    value: String,
    progress: Float?,
) {
    Column(
        modifier = modifier.padding(top = 1.dp),
        verticalArrangement = Arrangement.spacedBy(WearSpacing.xs),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = WearColors.accentPrimary.copy(alpha = 0.75f),
                modifier = Modifier.size(WearSizes.statIcon),
            )
            Spacer(modifier = Modifier.width(WearSpacing.xs))
            Text(
                text = label,
                style = WearTypography.cardLabel,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            text = value,
            style = WearTypography.cardValue,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (progress != null) {
            LinearProgressIndicator(
                progress = { progress.coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(WearSizes.progressHeight)
                    .padding(top = WearSpacing.xxs),
                color = WearColors.accentPrimary,
                trackColor = WearColors.surface2,
            )
        } else {
            Spacer(modifier = Modifier.height(WearSpacing.xs))
        }
    }
}
