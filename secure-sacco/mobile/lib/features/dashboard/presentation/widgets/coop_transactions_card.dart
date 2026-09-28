import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../payments/data/payment_providers.dart';
import '../../../payments/data/payment_dto.dart';

class CoopTransactionsCard extends ConsumerStatefulWidget {
  const CoopTransactionsCard({super.key});

  @override
  ConsumerState<CoopTransactionsCard> createState() => _CoopTransactionsCardState();
}

class _CoopTransactionsCardState extends ConsumerState<CoopTransactionsCard> {
  CoopFeedResponse? _data;
  bool _isLoading = true;
  String? _error;
  bool _expanded = true;
  bool _reEnriching = false;
  String? _reEnrichMsg;
  
  final _currencyFormatter = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);
  final _dateFormatter = DateFormat('dd MMM yyyy, HH:mm');

  @override
  void initState() {
    super.initState();
    _fetchFeed();
  }

  Future<void> _fetchFeed() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final repository = ref.read(paymentRepositoryProvider);
      final data = await repository.getCoopFeed(size: 50);
      if (mounted) {
        setState(() {
          _data = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load transactions: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleReEnrich() async {
    if (!mounted) return;
    setState(() {
      _reEnriching = true;
      _reEnrichMsg = null;
    });

    try {
      final repository = ref.read(paymentRepositoryProvider);
      final res = await repository.reEnrichCoopTransactions();
      if (mounted) {
        setState(() {
          _reEnrichMsg = res['message'] ?? 'Re-match successful';
        });
        await _fetchFeed();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _reEnrichMsg = 'Error: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _reEnriching = false;
        });
        Future.delayed(const Duration(seconds: 4), () {
          if (mounted) {
            setState(() {
              _reEnrichMsg = null;
            });
          }
        });
      }
    }
  }

  String _transactionLabel(CoopTransaction t) {
    if (t.transactionType == 'DR') return 'Bank';
    if (t.mpesaRef?.startsWith('POSAG') == true) return 'POS Agent';
    if (t.source == 'STK_CALLBACK') return 'STK';
    if (t.source == 'IPN' || t.source == 'MINI_STATEMENT') return 'M-Pesa';
    return t.source;
  }


  void _showFullHistory(BuildContext context, List<CoopTransaction> allTransactions) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.borderRadiusLg)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Full Transaction History',
                        style: AppTextStyles.h3,
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      )
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView.separated(
                    controller: scrollController,
                    itemCount: allTransactions.length,
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final t = allTransactions[index];
                      final isCredit = t.transactionType == 'CR';
                      return Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isCredit ? AppColors.positive.withAlpha(25) : AppColors.negative.withAlpha(25),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                                color: isCredit ? AppColors.positive : AppColors.negative,
                                size: 16,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          t.displayName ?? t.senderPhone ?? 'Unknown',
                                          style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Text(
                                        '${isCredit ? "+" : "-"}${_currencyFormatter.format(t.amount)}',
                                        style: AppTextStyles.bodyMedium.copyWith(
                                          color: isCredit ? AppColors.positive : AppColors.negative,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        t.transactionDate != null 
                                          ? _dateFormatter.format(DateTime.tryParse(t.transactionDate!) ?? DateTime.now()) 
                                          : '—',
                                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.background,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          _transactionLabel(t),
                                          style: AppTextStyles.bodySmall.copyWith(fontSize: 10),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final transactions = _data?.transactions ?? [];
    
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.blue.withAlpha(25),
                          borderRadius: BorderRadius.circular(AppSpacing.borderRadiusMd),
                        ),
                        child: const Icon(Icons.account_balance, color: Colors.blue, size: 20),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Co-op Transactions',
                              style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              'M-Pesa · POS Agent · Bank · ${_data?.totalElements ?? 0} total',
                              style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary, fontSize: 11),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: _reEnriching
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.link, size: 18),
                      onPressed: _reEnriching || _isLoading ? null : _handleReEnrich,
                      tooltip: 'Re-match unmatched phone numbers to members',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    IconButton(
                      icon: _isLoading
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.refresh, size: 18),
                      onPressed: _isLoading ? null : _fetchFeed,
                      tooltip: 'Refresh',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    IconButton(
                      icon: Icon(_expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, size: 18),
                      onPressed: () => setState(() => _expanded = !_expanded),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                )
              ],
            ),
          ),
          
          if (_reEnrichMsg != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
              width: double.infinity,
              color: _reEnrichMsg!.startsWith('Error') 
                  ? AppColors.negative.withAlpha(25) 
                  : AppColors.positive.withAlpha(25),
              child: Text(
                _reEnrichMsg!,
                style: AppTextStyles.bodySmall.copyWith(
                  color: _reEnrichMsg!.startsWith('Error') ? AppColors.negative : AppColors.positive,
                ),
              ),
            ),
            
          if (_expanded) ...[
            const Divider(height: 1),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Text(_error!, style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative)),
              )
            else if (_isLoading && transactions.isEmpty)
              const Padding(
                padding: EdgeInsets.all(AppSpacing.xl),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (transactions.isEmpty)
              const Padding(
                padding: EdgeInsets.all(AppSpacing.xl),
                child: Center(child: Text('No transactions found.')),
              )

            else
              Column(
                children: [
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: transactions.length > 5 ? 5 : transactions.length,
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final t = transactions[index];
                      final isCredit = t.transactionType == 'CR';
                      
                      return Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isCredit ? AppColors.positive.withAlpha(25) : AppColors.negative.withAlpha(25),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                                color: isCredit ? AppColors.positive : AppColors.negative,
                                size: 16,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          t.displayName ?? t.senderPhone ?? 'Unknown',
                                          style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Text(
                                        '${isCredit ? "+" : "-"}${_currencyFormatter.format(t.amount)}',
                                        style: AppTextStyles.bodyMedium.copyWith(
                                          color: isCredit ? AppColors.positive : AppColors.negative,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        t.transactionDate != null 
                                          ? _dateFormatter.format(DateTime.tryParse(t.transactionDate!) ?? DateTime.now()) 
                                          : '—',
                                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.background,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          _transactionLabel(t),
                                          style: AppTextStyles.bodySmall.copyWith(fontSize: 10),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  if (transactions.length > 5)
                    Column(
                      children: [
                        const Divider(height: 1),
                        InkWell(
                          onTap: () => _showFullHistory(context, transactions),
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Center(
                              child: Text(
                                'View Full History',
                                style: AppTextStyles.bodyMedium.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                ],
              ),

          ],
        ],
      ),
    );
  }
}
