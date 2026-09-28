import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';
import '../../data/penalty_providers.dart';
import 'create_edit_penalty_rule_screen.dart';

class PenaltyRulesTab extends ConsumerWidget {
  const PenaltyRulesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rulesAsync = ref.watch(penaltyRulesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateEditPenaltyRuleScreen()),
          ).then((_) => ref.invalidate(penaltyRulesProvider));
        },
        child: const Icon(Icons.add),
      ),
      body: rulesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => ErrorStateView.network(
          onRetry: () => ref.invalidate(penaltyRulesProvider),
        ),
        data: (rules) {
          if (rules.isEmpty) {
            return const Center(child: Text('No penalty rules configured.'));
          }
          
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(penaltyRulesProvider);
              try { await ref.read(penaltyRulesProvider.future); } catch (_) {}
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: rules.length,
              itemBuilder: (context, index) {
                final rule = rules[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: AppColors.border)),
                  elevation: 0,
                  child: ListTile(
                    title: Text(rule.name, style: AppTextStyles.h3),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text('Code: ${rule.code}'),
                        Text('Base Amount: ${rule.baseAmountType == 'PERCENTAGE' ? '${rule.baseAmountValue}%' : 'KES ${rule.baseAmountValue}'}'),
                        if (!rule.isActive)
                          const Text('INACTIVE', style: TextStyle(color: AppColors.negative, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.edit, color: AppColors.primary),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => CreateEditPenaltyRuleScreen(rule: rule)),
                        ).then((_) => ref.invalidate(penaltyRulesProvider));
                      },
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
