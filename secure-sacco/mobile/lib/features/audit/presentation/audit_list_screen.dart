import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/audit_providers.dart';
import '../data/audit_dto.dart';
import 'audit_detail_dialog.dart';
import '../../admin/presentation/widgets/admin_drawer.dart';

class AuditListScreen extends ConsumerStatefulWidget {
  const AuditListScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AuditListScreen> createState() => _AuditListScreenState();
}

class _AuditListScreenState extends ConsumerState<AuditListScreen> {
  int _currentPage = 0;
  final int _pageSize = 20;

  String? _actorEmail;
  String? _eventType;
  DateTime? _fromDate;
  DateTime? _toDate;

  final TextEditingController _actorController = TextEditingController();

  final List<String> _eventTypes = [
    'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED', 'USER_UPDATED',
    'MEMBER_REGISTERED', 'MEMBER_UPDATED', 'MEMBER_APPROVED',
    'ACCOUNT_CREATED', 'ACCOUNT_UPDATED',
    'ASSET_CREATED', 'ASSET_UPDATED',
    'LOAN_APPLIED', 'LOAN_APPROVED', 'LOAN_REJECTED', 'LOAN_DISBURSED',
    'PAYMENT_PROCESSED', 'TRANSACTION_CREATED', 'ROLE_UPDATED',
  ];

  @override
  void dispose() {
    _actorController.dispose();
    super.dispose();
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Filter Audit Logs',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _actorController,
                    decoration: InputDecoration(
                      labelText: 'Actor Email',
                      prefixIcon: const Icon(Icons.person),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onChanged: (val) => _actorEmail = val,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _eventType,
                    decoration: InputDecoration(
                      labelText: 'Event Type',
                      prefixIcon: const Icon(Icons.event),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('All Events')),
                      ..._eventTypes.map((e) => DropdownMenuItem(value: e, child: Text(e))),
                    ],
                    onChanged: (val) {
                      setSheetState(() {
                        _eventType = val;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: _fromDate ?? DateTime.now(),
                              firstDate: DateTime(2020),
                              lastDate: DateTime.now(),
                            );
                            if (date != null) {
                              setSheetState(() {
                                _fromDate = date;
                              });
                            }
                          },
                          child: InputDecorator(
                            decoration: InputDecoration(
                              labelText: 'From Date',
                              prefixIcon: const Icon(Icons.calendar_today, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Text(
                              _fromDate != null ? DateFormat('yyyy-MM-dd').format(_fromDate!.toLocal()) : 'Select',
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: _toDate ?? DateTime.now(),
                              firstDate: DateTime(2020),
                              lastDate: DateTime.now(),
                            );
                            if (date != null) {
                              setSheetState(() {
                                _toDate = date;
                              });
                            }
                          },
                          child: InputDecorator(
                            decoration: InputDecoration(
                              labelText: 'To Date',
                              prefixIcon: const Icon(Icons.calendar_today, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Text(
                              _toDate != null ? DateFormat('yyyy-MM-dd').format(_toDate!.toLocal()) : 'Select',
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () {
                          setSheetState(() {
                            _actorEmail = null;
                            _actorController.clear();
                            _eventType = null;
                            _fromDate = null;
                            _toDate = null;
                          });
                          setState(() {
                            _currentPage = 0;
                          });
                          Navigator.of(context).pop();
                        },
                        child: const Text('Reset'),
                      ),
                      const SizedBox(width: 16),
                      FilledButton(
                        onPressed: () {
                          setState(() {
                            _currentPage = 0;
                          });
                          Navigator.of(context).pop();
                        },
                        child: const Text('Apply Filters'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        );
      },
    );
  }

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return DateFormat('MMM dd, yyyy HH:mm:ss').format(date.toLocal());
    } catch (_) {
      return isoDate;
    }
  }

  Color _getEventColor(String action) {
    final a = action.toUpperCase();
    if (a.contains('FAIL') || a.contains('KILL') || a.contains('WAIVE') || a.contains('DELETE')) return Colors.red;
    if (a.contains('LOGIN') || a.contains('DISBURSE') || a.contains('COMPLETE') || a.contains('APPROVED')) return Colors.green;
    return Colors.blueGrey;
  }

  @override
  Widget build(BuildContext context) {
    final String? fromStr = _fromDate != null ? DateFormat('yyyy-MM-dd').format(_fromDate!.toLocal()) : null;
    final String? toStr = _toDate != null ? DateFormat('yyyy-MM-dd').format(_toDate!.toLocal()) : null;

    final params = AuditLogParams(
      page: _currentPage,
      size: _pageSize,
      actorEmail: _actorEmail,
      eventType: _eventType,
      from: fromStr,
      to: toStr,
    );

    final auditLogsAsync = ref.watch(auditLogsProvider(params));

    return Scaffold(
      drawer: const AdminDrawer(),
      appBar: AppBar(
        title: const Text('Audit Logs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
            tooltip: 'Filter Logs',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(auditLogsProvider(params));
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: auditLogsAsync.when(
        data: (response) {
          if (response.content.isEmpty) {
            return const Center(child: Text('No audit logs found.'));
          }

          return Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Showing ${response.content.length} of ${response.totalElements} events',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      'Page ${response.page + 1} of ${response.totalPages == 0 ? 1 : response.totalPages}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.separated(
                  itemCount: response.content.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final log = response.content[index];
                    final eventColor = _getEventColor(log.action);
                    
                    return InkWell(
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (context) => AuditDetailDialog(log: log),
                        );
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: eventColor.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.bolt,
                                color: eventColor,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          log.action,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        _formatDate(log.createdAt),
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Theme.of(context).colorScheme.outline,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    log.actor,
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.primary,
                                      fontSize: 13,
                                    ),
                                  ),
                                  if (log.target != null && log.target!.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      'Target: ${log.target}',
                                      style: TextStyle(
                                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                                        fontSize: 13,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              if (response.totalPages > 1)
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.chevron_left),
                        onPressed: _currentPage > 0
                            ? () {
                                setState(() {
                                  _currentPage--;
                                });
                              }
                            : null,
                      ),
                      const SizedBox(width: 16),
                      Text('Page ${_currentPage + 1}'),
                      const SizedBox(width: 16),
                      IconButton(
                        icon: const Icon(Icons.chevron_right),
                        onPressed: _currentPage < response.totalPages - 1
                            ? () {
                                setState(() {
                                  _currentPage++;
                                });
                              }
                            : null,
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text('Error loading logs', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(error.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref.invalidate(auditLogsProvider(params)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
