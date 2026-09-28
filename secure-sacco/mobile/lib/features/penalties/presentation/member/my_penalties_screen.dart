import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';
import '../../data/penalty_providers.dart';
import '../../../payments/presentation/payment_bottom_sheet.dart';
import 'package:intl/intl.dart';

class MyPenaltiesScreen extends ConsumerWidget {
  const MyPenaltiesScreen({super.key});

  String _formatCurrency(double amount) {
    return NumberFormat.currency(symbol: 'KES ', decimalDigits: 2).format(amount);
  }

  String _formatDate(String? isoString) {
    if (isoString == null) return '';
    try {
      final dt = DateTime.parse(isoString);
      return DateFormat('dd MMM yyyy').format(dt.toLocal());
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final penaltiesAsync = ref.watch(myPenaltiesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Penalties'),
      ),
      backgroundColor: AppColors.background,
      body: penaltiesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => ErrorStateView.network(
          onRetry: () => ref.invalidate(myPenaltiesProvider),
        ),
        data: (penalties) {
          if (penalties.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_outline, size: 64, color: AppColors.positive),
                    SizedBox(height: AppSpacing.md),
                    Text('All Clear!', style: AppTextStyles.h2),
                    SizedBox(height: AppSpacing.sm),
                    Text('You have no outstanding penalties.', style: AppTextStyles.bodyMedium),
                  ],
                ),
              ),
            );
          }

          final totalOutstanding = penalties.fold(0.0, (sum, p) => sum + p.outstandingAmount);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(myPenaltiesProvider);
              try { await ref.read(myPenaltiesProvider.future); } catch (_) {}
            },
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                // Summary Card
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: AppColors.negative.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
                    border: Border.all(color: AppColors.negative.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Outstanding', style: AppTextStyles.bodyMedium),
                          const SizedBox(height: 4),
                          Text(
                            _formatCurrency(totalOutstanding),
                            style: AppTextStyles.h2.copyWith(color: AppColors.negative),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        onPressed: () {
                          _showRepayBottomSheet(context, ref, 'ALL', totalOutstanding);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text('Pay All', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                
                // Penalty List
                ...penalties.map((p) => Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
                    side: BorderSide(color: AppColors.border),
                  ),
                  elevation: 0,
                  color: AppColors.surface,
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                p.ruleName,
                                style: AppTextStyles.h3.copyWith(color: AppColors.negative),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.negative.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Outstanding: ${_formatCurrency(p.outstandingAmount)}',
                                style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text('Applied on: ${_formatDate(p.createdAt)}', style: AppTextStyles.bodySmall),
                        const SizedBox(height: AppSpacing.sm),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Original: ${_formatCurrency(p.originalAmount)}', style: AppTextStyles.bodySmall),
                                  if (p.interestPaid > 0)
                                    Text('Interest Paid: ${_formatCurrency(p.interestPaid)}', style: AppTextStyles.bodySmall),
                                  if (p.principalPaid > 0)
                                    Text('Principal Paid: ${_formatCurrency(p.principalPaid)}', style: AppTextStyles.bodySmall),
                                  if (p.amountWaived > 0)
                                    Text('Waived: ${_formatCurrency(p.amountWaived)}', style: AppTextStyles.bodySmall.copyWith(color: AppColors.positive)),
                                ],
                              ),
                            ),
                            OutlinedButton(
                              onPressed: () {
                                _showRepayBottomSheet(context, ref, p.id, p.outstandingAmount);
                              },
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.primary),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Pay This'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )).toList(),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showRepayBottomSheet(BuildContext context, WidgetRef ref, String penaltyId, double amount) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PaymentBottomSheet(
        amount: amount,
        accountReference: penaltyId == 'ALL' ? 'ALL_PENALTIES' : 'PENALTY',
        title: 'Repay Penalty',
        description: 'Enter your M-Pesa phone number to receive a payment prompt for the penalty.',
        onSubmit: (phone, amt) async {
          final repo = ref.read(penaltyRepositoryProvider);
          final res = await repo.repayPenalty(
            phoneNumber: phone,
            amount: amt,
            penaltyId: penaltyId == 'ALL' ? null : penaltyId,
          );
          
          // Optionally invalidate the provider here to refresh the list in the background
          ref.invalidate(myPenaltiesProvider);
          
          return res.customerMessage.isNotEmpty ? res.customerMessage : 'Payment prompt sent.';
        },
      ),
    );
  }
}
