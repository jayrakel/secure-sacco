import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/error_state_view.dart';
import '../../../members/data/member_dto.dart';
import '../../../members/data/member_providers.dart';
import '../../../members/data/member_repository.dart';
import '../../../auth/data/auth_state.dart';
import '../../data/savings_providers.dart';
import 'widgets/manual_transaction_dialog.dart';

class SavingsManagementScreen extends ConsumerStatefulWidget {
  const SavingsManagementScreen({super.key});

  @override
  ConsumerState<SavingsManagementScreen> createState() => _SavingsManagementScreenState();
}

class _SavingsManagementScreenState extends ConsumerState<SavingsManagementScreen> {
  final TextEditingController _searchController = TextEditingController();
  MemberDto? _selectedMember;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showTransactionDialog(bool isDeposit) {
    if (_selectedMember == null) return;
    showDialog(
      context: context,
      builder: (context) => ManualTransactionDialog(
        memberId: _selectedMember!.id,
        isDeposit: isDeposit,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(symbol: 'KES ');
    final permissions = ref.watch(authControllerProvider).permissions;
    final canPostManual = permissions.contains('SAVINGS_MANUAL_POST');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Savings Management', style: AppTextStyles.h3.copyWith(color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primary),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Search Section
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Autocomplete<MemberDto>(
              displayStringForOption: (option) => option.fullName,
              fieldViewBuilder: (context, textEditingController, focusNode, onFieldSubmitted) {
                return TextField(
                  controller: textEditingController,
                  focusNode: focusNode,
                  decoration: InputDecoration(
                    hintText: 'Search members by name...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    filled: true,
                    fillColor: AppColors.background,
                  ),
                );
              },
              optionsBuilder: (textEditingValue) async {
                if (textEditingValue.text.length < 2) {
                  return const Iterable<MemberDto>.empty();
                }
                final repository = ref.read(memberRepositoryProvider);
                final page = await repository.getMembers(query: textEditingValue.text);
                return page.content;
              },
              onSelected: (member) {
                setState(() {
                  _selectedMember = member;
                });
              },
            ),
          ),
          
          Expanded(
            child: _selectedMember == null
                ? const Center(child: Text('Search and select a member to view their savings vault.'))
                : _buildMemberVault(context, ref, _selectedMember!, currencyFormatter, canPostManual),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberVault(BuildContext context, WidgetRef ref, MemberDto member, NumberFormat currencyFormatter, bool canPostManual) {
    final balanceAsync = ref.watch(memberSavingsBalanceProvider(member.id));
    final statementAsync = ref.watch(memberSavingsStatementProvider(member.id));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(memberSavingsBalanceProvider(member.id));
        ref.invalidate(memberSavingsStatementProvider(member.id));
      },
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          // Member Info & Balance
          balanceAsync.when(
            data: (balance) => Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${member.firstName} ${member.lastName}', style: AppTextStyles.h3),
                    Text(member.memberNumber ?? member.phoneNumber, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                    const SizedBox(height: AppSpacing.md),
                    const Divider(),
                    const SizedBox(height: AppSpacing.md),
                    Text('Available Balance', style: AppTextStyles.bodyMedium),
                    Text(
                      currencyFormatter.format(balance.availableBalance),
                      style: AppTextStyles.h1.copyWith(color: AppColors.primary),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text('Status: ${balance.accountStatus}', style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, s) => ErrorStateView(message: e.toString(), onRetry: () => ref.refresh(memberSavingsBalanceProvider(member.id))),
          ),
          
          if (canPostManual) ...[
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showTransactionDialog(true),
                    icon: const Icon(Icons.download),
                    label: const Text('Receive Cash'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.positive, foregroundColor: AppColors.surface),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showTransactionDialog(false),
                    icon: const Icon(Icons.upload),
                    label: const Text('Payout Cash'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.negative, foregroundColor: AppColors.surface),
                  ),
                ),
              ],
            ),
          ],
          
          const SizedBox(height: AppSpacing.xl),
          Text('Official Statement', style: AppTextStyles.h3),
          const SizedBox(height: AppSpacing.sm),
          
          statementAsync.when(
            data: (statement) {
              if (statement.isEmpty) {
                return const Card(
                  child: Padding(
                    padding: EdgeInsets.all(AppSpacing.xl),
                    child: Center(child: Text('No transactions found')),
                  ),
                );
              }
              
              return Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: statement.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final txn = statement[index];
                    final isPositive = txn.type == 'DEPOSIT' || txn.type == 'EXPENSE_REIMBURSEMENT';
                    return ListTile(
                      title: Text(txn.type, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
                      subtitle: Text(
                        '${txn.channel} • Ref: ${txn.reference}\n'
                        '${txn.postedAt != null ? DateFormat.yMMMd().add_jm().format(txn.postedAt!.toLocal()) : 'Pending'}',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                      ),
                      isThreeLine: true,
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${isPositive ? '+' : '-'}${currencyFormatter.format(txn.amount)}',
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.bold,
                              color: isPositive ? AppColors.positive : AppColors.negative,
                            ),
                          ),
                          Text(
                            txn.status,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: txn.status == 'POSTED' ? AppColors.positive : AppColors.warning,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, s) => ErrorStateView(message: e.toString(), onRetry: () => ref.refresh(memberSavingsStatementProvider(member.id))),
          ),
        ],
      ),
    );
  }
}
