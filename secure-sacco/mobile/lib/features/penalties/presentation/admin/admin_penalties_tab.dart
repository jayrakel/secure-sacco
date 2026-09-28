import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';
import '../../data/penalty_dto.dart';
import '../../data/penalty_providers.dart';
import 'package:intl/intl.dart';

class AdminPenaltiesTab extends ConsumerStatefulWidget {
  const AdminPenaltiesTab({super.key});

  @override
  ConsumerState<AdminPenaltiesTab> createState() => _AdminPenaltiesTabState();
}

class _AdminPenaltiesTabState extends ConsumerState<AdminPenaltiesTab> {
  String _searchQuery = '';

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

  void _showWaiveDialog(BuildContext context, StaffPenalty penalty) {
    final amountController = TextEditingController(text: penalty.outstandingAmount.toString());
    final reasonController = TextEditingController();
    bool isSaving = false;
    String? error;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Waive Penalty'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${penalty.memberName} - ${penalty.memberNumber}', style: AppTextStyles.bodyMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Text('Rule: ${penalty.ruleName}'),
                    Text('Outstanding: ${_formatCurrency(penalty.outstandingAmount)}', style: AppTextStyles.bodyLarge.copyWith(color: AppColors.negative)),
                    const SizedBox(height: AppSpacing.md),
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: Text(error!, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.negative)),
                      ),
                    TextField(
                      controller: amountController,
                      decoration: const InputDecoration(labelText: 'Amount to Waive (KES)', border: OutlineInputBorder()),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: reasonController,
                      decoration: const InputDecoration(labelText: 'Reason', border: OutlineInputBorder()),
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSaving ? null : () async {
                    setState(() {
                      error = null;
                      isSaving = true;
                    });
                    try {
                      final amount = double.tryParse(amountController.text) ?? 0.0;
                      final reason = reasonController.text.trim();
                      if (amount <= 0 || amount > penalty.outstandingAmount) {
                        setState(() { error = 'Invalid amount'; isSaving = false; });
                        return;
                      }
                      if (reason.isEmpty) {
                        setState(() { error = 'Reason is required'; isSaving = false; });
                        return;
                      }
                      
                      final repo = ref.read(penaltyRepositoryProvider);
                      await repo.waivePenalty(penalty.id, amount: amount, reason: reason);
                      
                      if (context.mounted) {
                        Navigator.pop(context);
                        ref.invalidate(staffPenaltiesProvider);
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Penalty waived successfully')));
                      }
                    } catch (e) {
                      setState(() { error = 'Failed to waive penalty'; isSaving = false; });
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.negative),
                  child: isSaving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Waive', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          }
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final penaltiesAsync = ref.watch(staffPenaltiesProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search by name, number, or rule...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onChanged: (value) => setState(() => _searchQuery = value.toLowerCase()),
          ),
        ),
        Expanded(
          child: penaltiesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => ErrorStateView.network(
              onRetry: () => ref.invalidate(staffPenaltiesProvider),
            ),
            data: (penalties) {
              final filtered = penalties.where((p) => 
                p.memberName.toLowerCase().contains(_searchQuery) ||
                p.memberNumber.toLowerCase().contains(_searchQuery) ||
                p.ruleName.toLowerCase().contains(_searchQuery)
              ).toList();

              if (filtered.isEmpty) {
                return const Center(child: Text('No open penalties found.'));
              }

              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(staffPenaltiesProvider);
                  try { await ref.read(staffPenaltiesProvider.future); } catch (_) {}
                },
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final p = filtered[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: AppColors.border)),
                      elevation: 0,
                      child: ListTile(
                        title: Text('${p.memberName} (${p.memberNumber})', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.ruleName, style: AppTextStyles.bodyMedium),
                            Text('Applied: ${_formatDate(p.createdAt)}', style: AppTextStyles.bodySmall),
                          ],
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(_formatCurrency(p.outstandingAmount), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.negative)),
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () => _showWaiveDialog(context, p),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.negative,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text('Waive', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
