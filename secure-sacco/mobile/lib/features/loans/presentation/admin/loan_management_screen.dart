import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/loan_dto.dart';
import '../../data/loan_providers.dart';

class LoanManagementScreen extends ConsumerStatefulWidget {
  const LoanManagementScreen({super.key});

  @override
  ConsumerState<LoanManagementScreen> createState() => _LoanManagementScreenState();
}

class _LoanManagementScreenState extends ConsumerState<LoanManagementScreen> {
  String _selectedStatus = 'ALL';

  final List<String> _statuses = [
    'ALL',
    'PENDING',
    'VERIFIED',
    'APPROVED',
    'REJECTED',
    'ACTIVE',
    'CLEARED'
  ];

  @override
  Widget build(BuildContext context) {
    final applicationsAsync = ref.watch(allLoanApplicationsProvider);
    final currencyFormat = NumberFormat.currency(symbol: 'KES ');
    final dateFormat = DateFormat('MMM dd, yyyy');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loan Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(allLoanApplicationsProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: applicationsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Failed to load applications: $err')),
              data: (applications) {
                final filtered = applications.where((app) {
                  if (_selectedStatus == 'ALL') return true;
                  return app.status.toUpperCase() == _selectedStatus;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(child: Text('No loan applications found.'));
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(allLoanApplicationsProvider.future),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final app = filtered[index];
                      return _buildLoanCard(context, app, currencyFormat, dateFormat);
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

  Widget _buildFilters() {
    return Container(
      height: 50,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _statuses.length,
        itemBuilder: (context, index) {
          final status = _statuses[index];
          final isSelected = _selectedStatus == status;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(status),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) {
                  setState(() => _selectedStatus = status);
                }
              },
              selectedColor: Colors.blue.shade100,
              checkmarkColor: Colors.blue.shade900,
            ),
          );
        },
      ),
    );
  }

  Widget _buildLoanCard(
    BuildContext context,
    LoanApplication app,
    NumberFormat currencyFormat,
    DateFormat dateFormat,
  ) {
    final statusColor = _getStatusColor(app.status);
    DateTime? createdAt;
    try {
      createdAt = DateTime.parse(app.createdAt);
    } catch (_) {}

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => context.push('/admin/loans/${app.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '${app.memberName} (${app.memberNumber})',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: statusColor),
                    ),
                    child: Text(
                      app.status,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                app.productName,
                style: TextStyle(color: Colors.blue.shade900, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Amount',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        currencyFormat.format(app.principalAmount),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Date',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        createdAt != null ? dateFormat.format(createdAt) : 'Unknown',
                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return Colors.orange;
      case 'VERIFIED':
        return Colors.blue;
      case 'APPROVED':
        return Colors.teal;
      case 'ACTIVE':
        return AppColors.positive;
      case 'REJECTED':
        return AppColors.negative;
      case 'CLEARED':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}
