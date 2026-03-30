package com.shiftcoach.wear.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import com.shiftcoach.wear.theme.WearColors
import com.shiftcoach.wear.theme.WearRadius
import com.shiftcoach.wear.theme.WearSpacing
import com.shiftcoach.wear.theme.WearTypography

/** Compact secondary highlight (sleep, heart rate, etc.). Not tappable. */
@Composable
fun StatChip(
    label: String,
    value: String,
    isLoading: Boolean = false,
    modifier: Modifier = Modifier,
) {
    if (isLoading) {
        StatChipSkeleton(modifier = modifier)
        return
    }
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(WearRadius.chip))
            .background(WearColors.surface2)
            .padding(
                horizontal = WearSpacing.chipPaddingHorizontal,
                vertical = WearSpacing.chipPaddingVertical,
            ),
        verticalArrangement = Arrangement.spacedBy(WearSpacing.xs),
    ) {
        Text(
            text = label,
            style = WearTypography.chipLabel,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = value,
            style = WearTypography.chipValue,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
