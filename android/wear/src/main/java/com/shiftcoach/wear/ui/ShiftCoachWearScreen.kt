package com.shiftcoach.wear.ui

import androidx.activity.ComponentActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.MoreTime
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.ScreenScaffold
import com.shiftcoach.wear.R
import com.shiftcoach.wear.data.WearDashboardRepository
import com.shiftcoach.wear.model.WearUiState
import com.shiftcoach.wear.theme.WearColors
import com.shiftcoach.wear.theme.WearSpacing
import com.shiftcoach.wear.theme.WearTypography
import com.shiftcoach.wear.ui.components.BodyclockHero
import com.shiftcoach.wear.ui.components.CompactTwoStatRow
import com.shiftcoach.wear.ui.components.InsightValueBlock
import com.shiftcoach.wear.ui.components.NonInteractiveCard
import com.shiftcoach.wear.ui.components.StatChip
import com.shiftcoach.wear.ui.components.SupportSectionLabel
import com.shiftcoach.wear.ui.components.WearSectionEnter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ShiftCoachWearScreen(apiBaseUrl: String, activity: ComponentActivity) {
    val unknownText = stringResource(R.string.label_unknown)
    val slotUnavailable = stringResource(R.string.wear_unavailable)

    var uiState by remember { mutableStateOf(WearUiState()) }
    var loadGeneration by remember { mutableIntStateOf(0) }
    val listState = rememberScalingLazyListState()
    val repository = remember(apiBaseUrl) { WearDashboardRepository(apiBaseUrl) }
    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }

    LaunchedEffect(loadGeneration) {
        try {
            uiState = WearUiState()
            try {
                listState.scrollToItem(0)
            } catch (_: Exception) {
                // ignore
            }
            repository.loadDashboard(activity) { uiState = it }
        } catch (_: Exception) {
            // ignore
        }
    }

    val hasAnyError = uiState.run {
        activityError || sleepError || engineError || shiftLagError || mealError || heartRateError
    }

    val heroLoading = !uiState.sleepError && uiState.bodyclockScore == null && !uiState.loadPassFinished
    val scoreText = when {
        uiState.sleepError -> unknownText
        heroLoading -> ""
        (uiState.bodyclockScore ?: 0) <= 0 -> unknownText
        else -> uiState.bodyclockScore.toString()
    }

    val showGlobalOffline = uiState.loadPassFinished && uiState.globalLoadFailure

    AppScaffold(modifier = Modifier.background(WearColors.background)) {
        ScreenScaffold(
            scrollState = listState,
            contentPadding = PaddingValues(
                horizontal = WearSpacing.screenHorizontal,
                vertical = WearSpacing.screenVertical,
            ),
        ) { contentPadding ->
            ScalingLazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                autoCentering = null,
                horizontalAlignment = Alignment.CenterHorizontally,
                contentPadding = contentPadding,
            ) {
                if (showGlobalOffline) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = WearSpacing.md),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(WearSpacing.md),
                        ) {
                            Text(
                                text = "SHIFTCOACH",
                                style = WearTypography.headerWordmark,
                            )
                            BodyclockHero(
                                scoreText = unknownText,
                                progress = null,
                                isLoading = false,
                                isError = false,
                                scoreIsNumeric = false,
                                primaryInsight = stringResource(R.string.wear_global_offline_title),
                                secondaryInsight = stringResource(R.string.wear_global_offline_body),
                                phaseLabel = null,
                                modifier = Modifier.padding(vertical = WearSpacing.sm),
                            )
                            Text(
                                text = stringResource(R.string.action_retry),
                                style = WearTypography.cardValue.copy(color = WearColors.accentPrimary),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(WearColors.surface2)
                                    .clickable { loadGeneration++ }
                                    .padding(horizontal = WearSpacing.xl, vertical = WearSpacing.md),
                            )
                        }
                    }
                } else {
                    item {
                        WearSectionEnter(sectionIndex = 0, loadKey = loadGeneration) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(
                                    text = "SHIFTCOACH",
                                    style = WearTypography.headerWordmark,
                                    modifier = Modifier.padding(bottom = WearSpacing.sm),
                                )
                                val progress =
                                    uiState.bodyclockScore?.coerceIn(0, 100)?.toFloat()?.div(100f)
                                BodyclockHero(
                                    scoreText = scoreText,
                                    progress = progress,
                                    isLoading = heroLoading,
                                    isError = uiState.sleepError,
                                    scoreIsNumeric = !heroLoading &&
                                        !uiState.sleepError &&
                                        (uiState.bodyclockScore ?: 0) > 0,
                                    primaryInsight = uiState.readinessInsightPrimary,
                                    secondaryInsight = uiState.readinessInsightSecondary,
                                    phaseLabel = uiState.shiftPhaseLabel,
                                    modifier = Modifier.padding(bottom = WearSpacing.sectionGap),
                                )
                            }
                        }
                    }

                    item {
                        WearSectionEnter(sectionIndex = 1, loadKey = loadGeneration) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(WearSpacing.sm),
                            ) {
                                StatChip(
                                    label = stringResource(R.string.wear_chip_sleep),
                                    value = when {
                                        uiState.sleepError -> slotUnavailable
                                        uiState.sleepLastNightText == null ->
                                            if (uiState.loadPassFinished) unknownText else ""
                                        else -> uiState.sleepLastNightText ?: unknownText
                                    },
                                    isLoading = !uiState.loadPassFinished &&
                                        !uiState.sleepError &&
                                        uiState.sleepLastNightText == null,
                                    modifier = Modifier.weight(1f),
                                )
                                StatChip(
                                    label = stringResource(R.string.wear_chip_heart),
                                    value = when {
                                        uiState.heartRateError -> slotUnavailable
                                        uiState.restingBpm == null ->
                                            if (uiState.loadPassFinished) unknownText else ""
                                        else -> stringResource(
                                            R.string.wear_resting_bpm,
                                            uiState.restingBpm!!,
                                        )
                                    },
                                    isLoading = !uiState.loadPassFinished &&
                                        !uiState.heartRateError &&
                                        uiState.restingBpm == null,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            Spacer(modifier = Modifier.height(WearSpacing.sectionGap))
                        }
                    }

                    item {
                        WearSectionEnter(sectionIndex = 2, loadKey = loadGeneration) {
                            SupportSectionLabel(stringResource(R.string.wear_section_plan))
                            NonInteractiveCard {
                                Column(verticalArrangement = Arrangement.spacedBy(WearSpacing.md)) {
                                    InsightValueBlock(
                                        icon = Icons.Default.MoreTime,
                                        label = stringResource(R.string.wear_label_shift_load),
                                        value = when {
                                            uiState.shiftLagError -> slotUnavailable
                                            uiState.shiftLagText == null ->
                                                if (uiState.loadPassFinished) unknownText else ""
                                            else -> uiState.shiftLagText ?: unknownText
                                        },
                                        progress = uiState.shiftLagScore?.let { s ->
                                            (s.toFloat() / 100f).coerceIn(0f, 1f)
                                        },
                                        isLoading = !uiState.loadPassFinished &&
                                            !uiState.shiftLagError &&
                                            uiState.shiftLagText == null,
                                    )
                                    InsightValueBlock(
                                        icon = Icons.Default.Restaurant,
                                        label = stringResource(R.string.wear_label_fuel),
                                        value = when {
                                            uiState.mealError -> slotUnavailable
                                            uiState.nextMealText == null ->
                                                if (uiState.loadPassFinished) unknownText else ""
                                            else -> uiState.nextMealText ?: unknownText
                                        },
                                        progress = null,
                                        isLoading = !uiState.loadPassFinished &&
                                            !uiState.mealError &&
                                            uiState.nextMealText == null,
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(WearSpacing.md))
                        }
                    }

                    item {
                        WearSectionEnter(sectionIndex = 3, loadKey = loadGeneration) {
                            SupportSectionLabel(stringResource(R.string.wear_section_movement))
                            NonInteractiveCard {
                                CompactTwoStatRow(
                                    leftLabel = stringResource(R.string.wear_label_steps),
                                    leftIcon = Icons.Default.DirectionsWalk,
                                    leftValue = when {
                                        uiState.activityError -> slotUnavailable
                                        uiState.steps == null ->
                                            if (uiState.loadPassFinished) unknownText else ""
                                        uiState.steps == 0 -> unknownText
                                        else -> uiState.steps.toString()
                                    },
                                    rightLabel = stringResource(R.string.wear_label_active),
                                    rightIcon = Icons.Default.Timer,
                                    rightValue = when {
                                        uiState.activityError -> slotUnavailable
                                        uiState.activeMinutes == null ->
                                            if (uiState.loadPassFinished) unknownText else ""
                                        else -> uiState.activeMinutes.toString()
                                    },
                                    leftProgress = uiState.steps?.let { (it / 10000f).coerceIn(0f, 1f) },
                                    rightProgress =
                                        uiState.activeMinutes?.let { (it / 120f).coerceIn(0f, 1f) },
                                    isLeftLoading = !uiState.loadPassFinished &&
                                        !uiState.activityError &&
                                        uiState.steps == null,
                                    isRightLoading = !uiState.loadPassFinished &&
                                        !uiState.activityError &&
                                        uiState.activeMinutes == null,
                                )
                            }
                            Spacer(modifier = Modifier.height(WearSpacing.md))
                        }
                    }

                    item {
                        WearSectionEnter(sectionIndex = 4, loadKey = loadGeneration) {
                            SupportSectionLabel(stringResource(R.string.wear_section_behavior))
                            NonInteractiveCard {
                                InsightValueBlock(
                                    icon = Icons.Default.Favorite,
                                    label = stringResource(R.string.wear_label_eating),
                                    value = when {
                                        uiState.engineError -> slotUnavailable
                                        uiState.bingeRisk == null ->
                                            if (uiState.loadPassFinished) unknownText else ""
                                        else -> uiState.bingeRisk ?: unknownText
                                    },
                                    progress = null,
                                    isLoading = !uiState.loadPassFinished &&
                                        !uiState.engineError &&
                                        uiState.bingeRisk == null,
                                )
                            }
                        }
                    }

                    item {
                        uiState.lastUpdatedMs?.let { ts ->
                            Text(
                                text = stringResource(R.string.wear_as_of, timeFormat.format(Date(ts))),
                                style = WearTypography.metaTimestamp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = WearSpacing.xxl),
                            )
                        }
                    }

                    if (hasAnyError && uiState.loadPassFinished && !uiState.globalLoadFailure) {
                        item {
                            Text(
                                text = stringResource(R.string.action_retry),
                                style = WearTypography.cardValue.copy(color = WearColors.accentPrimary),
                                modifier = Modifier
                                    .padding(top = WearSpacing.md)
                                    .clip(RoundedCornerShape(50))
                                    .background(WearColors.surface2)
                                    .clickable { loadGeneration++ }
                                    .padding(horizontal = WearSpacing.xl, vertical = WearSpacing.sm),
                            )
                        }
                    }
                }
            }
        }
    }
}
