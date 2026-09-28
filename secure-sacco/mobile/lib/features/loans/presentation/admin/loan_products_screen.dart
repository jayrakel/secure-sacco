import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/loan_dto.dart';
import '../../data/loan_providers.dart';

class LoanProductsScreen extends ConsumerWidget {
  const LoanProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(allLoanProductsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(allLoanProductsProvider),
          ),
        ],
      ),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Failed to load products: $err')),
        data: (products) {
          if (products.isEmpty) {
            return const Center(child: Text('No loan products found.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(allLoanProductsProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: products.length,
              itemBuilder: (context, index) {
                return _buildProductCard(context, ref, products[index]);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/admin/loans/products/create'),
        icon: const Icon(Icons.add),
        label: const Text('New Product'),
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, WidgetRef ref, LoanProduct product) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                product.name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            Switch(
              value: product.isActive,
              onChanged: (val) async {
                try {
                  final repo = ref.read(loanRepositoryProvider);
                  await repo.toggleProduct(product);
                  ref.invalidate(allLoanProductsProvider);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to toggle product status: $e')),
                    );
                  }
                }
              },
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            Text(product.description),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildInfoBadge('Interest', '${product.interestRate}% ${product.interestModel}'),
                _buildInfoBadge('Term', '${product.termWeeks} weeks'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildInfoBadge('App Fee', 'KES ${product.applicationFee}'),
                _buildInfoBadge('Grace Period', '${product.gracePeriodDays} days'),
              ],
            ),
          ],
        ),
        onTap: () {
          // Open edit screen and pass product details via extra
          context.push('/admin/loans/products/edit', extra: product);
        },
      ),
    );
  }

  Widget _buildInfoBadge(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label: ',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
