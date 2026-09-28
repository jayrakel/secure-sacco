import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/obligation_dto.dart';
import '../../data/obligation_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';

class MyObligationsScreen extends ConsumerStatefulWidget {
  const MyObligationsScreen({super.key});

  @override
  ConsumerState<MyObligationsScreen> createState() => _MyObligationsScreenState();
}

class _MyObligationsScreenState extends ConsumerState<MyObligationsScreen> {
  int _currentPage = 0;

  @override
  Widget build(BuildContext context) {
    final obligationsAsync = ref.watch(myObligationsProvider);
    final historyAsync = ref.watch(myObligationsHistoryProvider(_currentPage));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Savings Obligations'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myObligationsProvider);
          ref.invalidate(myObligationsHistoryProvider(_currentPage));
        },
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: obligationsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => ErrorStateView(
                    message: err.toString(),
                    onRetry: () => ref.refresh(myObligationsProvider),
                  ),
                  data: (obligations) {
                    if (obligations.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.withAlpha(50)),
                        ),
                        child: const Center(
                          child: Text('You have no active obligations.', style: AppTextStyles.bodyMedium),
                        ),
                      );
                    }
                    final current = obligations.firstWhere((o) => o.status == ObligationStatus.ACTIVE, orElse: () => obligations.first);
                    return _buildActiveObligationCard(current);
                  },
                ),
              ),
            ),
            
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(left: AppSpacing.md, right: AppSpacing.md, bottom: AppSpacing.sm, top: AppSpacing.md),
                child: Text('History', style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary)),
              ),
            ),

            historyAsync.when(
              loading: () => const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator())),
              error: (err, stack) => SliverToBoxAdapter(
                child: ErrorStateView(
                  message: err.toString(),
                  onRetry: () => ref.refresh(myObligationsHistoryProvider(_currentPage)),
                ),
              ),
              data: (history) {
                if (history.content.isEmpty) {
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Center(
                        child: Text('No historical periods found.', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                      ),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: _buildHistoryCard(history.content[index]),
                        );
                      },
                      childCount: history.content.length,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveObligationCard(ObligationResponse obligation) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withAlpha(50)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha(20),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Required Savings'.toUpperCase(), style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue.withAlpha(30),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  obligation.frequency.name,
                  style: AppTextStyles.bodySmall.copyWith(color: Colors.blue, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'KES ${obligation.amountDue.toStringAsFixed(2)}',
            style: AppTextStyles.h1.copyWith(color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.date_range, size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Text(
                'Started on ${DateFormat('MMM dd, yyyy').format(obligation.startDate.toLocal())}',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(ObligationPeriodResponse period) {
    Color statusColor;
    switch (period.computedStatus) {
      case PeriodStatus.OVERDUE:
        statusColor = AppColors.negative;
        break;
      case PeriodStatus.DUE:
        statusColor = AppColors.warning;
        break;
      case PeriodStatus.UPCOMING:
        statusColor = Colors.blue;
        break;
      case PeriodStatus.COVERED:
        statusColor = AppColors.positive;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.withAlpha(50)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${DateFormat('MMM dd').format(period.periodStart.toLocal())} - ${DateFormat('MMM dd, yyyy').format(period.periodEnd.toLocal())}',
                style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(30),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  period.computedStatus.name,
                  style: AppTextStyles.bodySmall.copyWith(color: statusColor, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMetric('Required', 'KES ${period.requiredAmount}'),
              _buildMetric('Paid', 'KES ${period.paidAmount}'),
              _buildMetric('Remaining', 'KES ${period.remaining}'),
            ],
          ),
          if (period.penaltyAmount != null && period.penaltyAmount! > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.negative.withAlpha(20),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.negative),
                  const SizedBox(width: 8),
                  Text(
                    'Penalty: KES ${period.penaltyAmount}',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ]
        ],
      ),
    );
  }

  Widget _buildMetric(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
