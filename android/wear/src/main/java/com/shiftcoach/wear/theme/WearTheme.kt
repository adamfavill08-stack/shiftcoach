package com.shiftcoach.wear.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Single source of truth for Wear UI tokens. Compose reads these values;
 * XML in res/values is aligned for window/theme compatibility only.
 */
object WearColors {
    val background = Color(0xFF000000)
    /** Slightly lifted card surface vs true black (optical depth). */
    val surfaceCard = Color(0xFF0E141C)
    val surface1 = Color(0xFF0B0F14)
    /** Chips / inset tracks — step up from card for hierarchy. */
    val surface2 = Color(0xFF151D28)
    val skeletonBase = Color(0xFF1A2430)
    val skeletonHighlight = Color(0xFF2A3544)

    /** One primary accent — do not duplicate with XML greens. */
    val accentPrimary = Color(0xFF20D38A)

    val textPrimary = Color(0xFFF0F4F8)
    val textSecondary = Color(0xFF94A3B8)

    val recovery = Color(0xFF22C55E)
    val caution = Color(0xFFF59E0B)
    val low = Color(0xFFEF4444)

    val trackMuted = accentPrimary.copy(alpha = 0.18f)

    /** Hairline separation — restraint vs hard borders. */
    val cardStroke = Color.White.copy(alpha = 0.045f)
}

object WearSpacing {
    val xxs: Dp = 2.dp
    val xs: Dp = 4.dp
    val sm: Dp = 6.dp
    val md: Dp = 8.dp
    val lg: Dp = 12.dp
    val xl: Dp = 16.dp
    val xxl: Dp = 20.dp
    /** Major section breaks (hero → chips → plan). */
    val sectionGap: Dp = 14.dp
    val screenHorizontal: Dp = 10.dp
    val screenVertical: Dp = 8.dp
    /** Optical padding inside cards (numbers breathe). */
    val cardPaddingHorizontal: Dp = 10.dp
    val cardPaddingVertical: Dp = 10.dp
    val chipPaddingHorizontal: Dp = 10.dp
    val chipPaddingVertical: Dp = 9.dp
    val heroScorePadding: Dp = 2.dp
}

object WearRadius {
    val chip: Dp = 20.dp
    val card: Dp = 18.dp
    val heroRing: Dp = 999.dp
}

object WearTypography {
    val headerWordmark = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 10.sp,
        letterSpacing = 0.8.sp,
        color = WearColors.textSecondary,
    )
    val heroScore = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        color = WearColors.textPrimary,
    )
    val heroScoreSuffix = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        color = WearColors.textSecondary,
    )
    val heroInsight = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        color = WearColors.textPrimary,
    )
    val heroInsightQuiet = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 10.sp,
        lineHeight = 13.sp,
        color = WearColors.textSecondary,
    )
    val phaseLabel = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 8.sp,
        letterSpacing = 0.6.sp,
        color = WearColors.accentPrimary.copy(alpha = 0.85f),
    )
    val cardLabel = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 10.sp,
        color = WearColors.textSecondary,
    )
    val cardValue = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        letterSpacing = 0.15.sp,
        color = WearColors.textPrimary,
    )
    val chipValue = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        color = WearColors.textPrimary,
    )
    val chipLabel = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 9.sp,
        color = WearColors.textSecondary,
    )
    val metaTimestamp = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 9.sp,
        color = WearColors.textSecondary.copy(alpha = 0.85f),
    )
}

/** Hero ring size (dp). */
object WearSizes {
    val bodyclockRing: Dp = 108.dp
    val bodyclockStroke: Dp = 9.dp
    val statIcon: Dp = 14.dp
    val progressHeight: Dp = 5.dp
}
