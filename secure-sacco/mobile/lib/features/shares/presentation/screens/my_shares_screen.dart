import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../data/share_providers.dart';
import '../../data/share_models.dart';
import '../../../payment_products/data/payment_product_providers.dart';

class MySharesScreen extends ConsumerStatefulWidget {
  const MySharesScreen({super.key});

  @override
  ConsumerState<MySharesScreen> createState() => _MySharesScreenState();
}

class _MySharesScreenState extends ConsumerState<MySharesScreen> {
  String? _selectedAccountId;

  @override
  Widget build(BuildContext context) {
    final accountsAsync = ref.watch(mySharesProvider);
    final activeProductsAsync = ref.watch(activePaymentProductsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Shares'),
        actions: [
          activeProductsAsync.when(
            data: (products) {
              final hasShareProducts = products.any((p) => p.moduleType == 'SHARE_CAPITAL' || p.moduleType == 'DEPOSIT_SHARES');
              if (!hasShareProducts) return const SizedBox.shrink();
              return IconButton(
                icon: const Icon(Icons.add),
                tooltip: 'Buy Shares',
                onPressed: () {
                  context.push('/member/deposits/new');
                },
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: accountsAsync.when(
        data: (accounts) {
          if (accounts.isEmpty) {
            return _buildEmptyState(activeProductsAsync);
          }

          _selectedAccountId ??= accounts.first.id;

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(mySharesProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                _buildAccountsList(accounts),
                const SizedBox(height: 24),
                if (_selectedAccountId != null)
                  _buildTransactionsSection(_selectedAccountId!),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text('Error: $error', style: const TextStyle(color: Colors.red)),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(AsyncValue activeProductsAsync) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.account_balance_wallet, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'No Share Accounts Found',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'You currently do not own any shares in the Sacco. Share accounts are automatically created when you make your first share purchase or when dividends are distributed.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            activeProductsAsync.when(
              data: (products) {
                final hasShareProducts = products.any((p) => p.moduleType == 'SHARE_CAPITAL' || p.moduleType == 'DEPOSIT_SHARES');
                if (!hasShareProducts) {
                  return const Text('Share purchases are currently disabled', style: TextStyle(color: Colors.red));
                }
                return ElevatedButton.icon(
                  onPressed: () {
                    context.push('/member/deposits/new');
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Purchase Shares'),
                );
              },
              loading: () => const CircularProgressIndicator(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountsList(List<ShareAccount> accounts) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 160,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: accounts.length,
            itemBuilder: (context, index) {
              final account = accounts[index];
              final isSelected = _selectedAccountId == account.id;
              final numberFormat = NumberFormat.currency(symbol: 'KES ', decimalDigits: 2);

              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedAccountId = account.id;
                  });
                },
                child: Container(
                  width: 280,
                  margin: const EdgeInsets.only(right: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? Theme.of(context).primaryColor : Colors.grey.shade300,
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        account.productName.toUpperCase(),
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        numberFormat.format(account.balance),
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: account.status == 'ACTIVE' ? Colors.green.shade100 : Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              account.status,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: account.status == 'ACTIVE' ? Colors.green.shade800 : Colors.grey.shade800,
                              ),
                            ),
                          ),
                          Text(
                            'Since ${DateFormat.yMd().format(account.createdAt)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTransactionsSection(String accountId) {
    final transactionsAsync = ref.watch(shareTransactionsProvider(accountId));

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              'Transaction History',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          const Divider(height: 1),
          transactionsAsync.when(
            data: (transactions) {
              if (transactions.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(32.0),
                  child: Center(
                    child: Text('No transactions found for this account.', style: TextStyle(color: Colors.grey)),
                  ),
                );
              }

              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: transactions.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final tx = transactions[index];
                  final numberFormat = NumberFormat.currency(symbol: '', decimalDigits: 2);
                  
                  Color typeColor;
                  switch (tx.type) {
                    case 'DEPOSIT':
                      typeColor = Colors.green;
                      break;
                    case 'DIVIDEND':
                      typeColor = Colors.blue;
                      break;
                    default:
                      typeColor = Colors.red;
                  }

                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    title: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          tx.type,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: typeColor,
                          ),
                        ),
                        Text(
                          '${tx.amount > 0 ? '+' : ''}${numberFormat.format(tx.amount)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: tx.amount > 0 ? Colors.green.shade700 : Colors.black,
                          ),
                        ),
                      ],
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${DateFormat.yMd().format(tx.createdAt)} ${DateFormat.Hm().format(tx.createdAt)}',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                          Text(
                            tx.reference.isEmpty ? '-' : tx.reference,
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
            loading: () => const Padding(
              padding: EdgeInsets.all(32.0),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text('Error: $error', style: const TextStyle(color: Colors.red)),
            ),
          ),
        ],
      ),
    );
  }
}
