import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/obligation_providers.dart';
import '../../data/obligation_repository.dart';
import '../../data/obligation_dto.dart';
import '../../../admin/presentation/widgets/admin_drawer.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';

class ObligationComplianceScreen extends ConsumerStatefulWidget {
  const ObligationComplianceScreen({super.key});

  @override
  ConsumerState<ObligationComplianceScreen> createState() => _ObligationComplianceScreenState();
}

class _ObligationComplianceScreenState extends ConsumerState<ObligationComplianceScreen> {
  int _currentPage = 0;
  bool _isEvaluating = false;

  Future<void> _handleEvaluation() async {
    setState(() {
      _isEvaluating = true;
    });
    try {
      final repo = ref.read(obligationRepositoryProvider);
      await repo.triggerEvaluation();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Evaluation completed successfully.')),
        );
      }
      ref.invalidate(complianceReportProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to run evaluation: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isEvaluating = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final responseAsync = ref.watch(complianceReportProvider(_currentPage));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Savings Compliance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Colors.white),
            onPressed: () {
              context.push('/admin/obligations/new');
            },
          ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: Column(
        children: [
          // Header / Summary Area
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            color: AppColors.surface,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Compliance Dashboard',
                        style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Members behind on their savings',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  icon: _isEvaluating
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.play_arrow, size: 16, color: Colors.white),
                  label: const Text('Evaluate', style: TextStyle(color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  onPressed: _isEvaluating ? null : _handleEvaluation,
                ),
              ],
            ),
          ),
          
          Expanded(
            child: responseAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => ErrorStateView(
                message: error.toString(),
                onRetry: () => ref.refresh(complianceReportProvider(_currentPage)),
              ),
              data: (data) {
                if (data.content.isEmpty) {
                  return const Center(child: Text('All members are fully compliant!'));
                }
                
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(complianceReportProvider(_currentPage));
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: data.content.length,
                    separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final entry = data.content[index];
                      return _buildComplianceCard(context, entry);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComplianceCard(BuildContext context, ObligationComplianceEntry entry) {
    Color statusColor;
    switch (entry.worstStatus) {
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
            children: [
              CircleAvatar(
                backgroundColor: AppColors.background,
                child: Text(
                  entry.memberName.isNotEmpty ? entry.memberName[0].toUpperCase() : '?',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(entry.memberName, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.bold)),
                    Text(entry.memberNumber, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(30),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  entry.worstStatus.name,
                  style: AppTextStyles.bodySmall.copyWith(color: statusColor, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMetric('Shortfall', 'KES ${entry.totalShortfall}', AppColors.warning),
              _buildMetric('Overdue', '${entry.totalOverduePeriods} periods', AppColors.negative),
              _buildMetric('Penalties', 'KES ${entry.totalPenalties}', AppColors.negative),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetric(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: AppTextStyles.bodyMedium.copyWith(color: color, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
