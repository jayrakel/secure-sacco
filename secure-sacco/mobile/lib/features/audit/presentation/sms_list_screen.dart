import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/sms_providers.dart';
import '../data/sms_dto.dart';
import '../data/sms_repository.dart';
import '../../admin/presentation/widgets/admin_drawer.dart';

class SmsListScreen extends ConsumerStatefulWidget {
  const SmsListScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SmsListScreen> createState() => _SmsListScreenState();
}

class _SmsListScreenState extends ConsumerState<SmsListScreen> {
  int _currentPage = 0;
  final int _pageSize = 20;
  String _search = '';
  String? _status;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return DateFormat('MMM dd, yyyy HH:mm:ss').format(date.toLocal());
    } catch (_) {
      return isoDate;
    }
  }

  void _showSendCustomSmsDialog() {
    final phoneController = TextEditingController();
    final messageController = TextEditingController();
    bool isSending = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Send Custom SMS'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: phoneController,
                    decoration: const InputDecoration(
                      labelText: 'Phone Number',
                      hintText: 'e.g. 0712345678',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: messageController,
                    decoration: const InputDecoration(
                      labelText: 'Message',
                      hintText: 'Type your message here...',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 4,
                    maxLength: 160,
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isSending ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: isSending
                      ? null
                      : () async {
                          final phone = phoneController.text.trim();
                          final message = messageController.text.trim();
                          if (phone.isEmpty || message.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please fill all fields')),
                            );
                            return;
                          }
                          setDialogState(() {
                            isSending = true;
                          });
                          try {
                            await ref
                                .read(smsRepositoryProvider)
                                .sendCustomSms(phoneNumber: phone, message: message);
                            if (mounted) {
                              Navigator.of(context).pop();
                              setState(() {
                                _currentPage = 0; // Refresh list
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('SMS Sent successfully')),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              setDialogState(() {
                                isSending = false;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          }
                        },
                  child: isSending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Send'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _retrySms(String id) async {
    try {
      await ref.read(smsRepositoryProvider).retrySms(id);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SMS retry initiated')),
      );
      setState(() {
        _currentPage = 0; // refresh
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to retry SMS: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final params = SmsLogParams(
      page: _currentPage,
      size: _pageSize,
      status: _status,
      search: _search,
    );

    final smsLogsAsync = ref.watch(smsLogsProvider(params));

    return Scaffold(
      drawer: const AdminDrawer(),
      appBar: AppBar(
        title: const Text('SMS Delivery Logs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.send),
            onPressed: _showSendCustomSmsDialog,
            tooltip: 'Send Custom SMS',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(smsLogsProvider(params));
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      labelText: 'Search phone number',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    onSubmitted: (value) {
                      setState(() {
                        _search = value;
                        _currentPage = 0;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 1,
                  child: DropdownButtonFormField<String?>(
                    value: _status,
                    decoration: InputDecoration(
                      labelText: 'Status',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
                      DropdownMenuItem(value: 'SENT', child: Text('Sent')),
                      DropdownMenuItem(value: 'FAILED', child: Text('Failed')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _status = value;
                        _currentPage = 0;
                      });
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: smsLogsAsync.when(
              data: (response) {
                if (response.content.isEmpty) {
                  return const Center(child: Text('No SMS logs found.'));
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
                            'Showing ${response.content.length} of ${response.totalElements} logs',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          Text(
                            'Page ${response.number + 1} of ${response.totalPages == 0 ? 1 : response.totalPages}',
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
                          
                          Color statusColor = Colors.grey;
                          if (log.status == 'SENT') statusColor = Colors.green;
                          if (log.status == 'FAILED') statusColor = Colors.red;
                          if (log.status == 'PENDING') statusColor = Colors.orange;

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: statusColor.withOpacity(0.1),
                              child: Icon(Icons.message, color: statusColor),
                            ),
                            title: Text(log.phoneNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text(
                                  log.message,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${_formatDate(log.createdAt)} • ${log.cost ?? '-'}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                if (log.status == 'FAILED' && log.providerResponse != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Error: ${log.providerResponse}',
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.error,
                                      fontSize: 12,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ]
                              ],
                            ),
                            trailing: log.status == 'FAILED'
                                ? IconButton(
                                    icon: const Icon(Icons.refresh, color: Colors.blue),
                                    tooltip: 'Retry Send',
                                    onPressed: () => _retrySms(log.id),
                                  )
                                : null,
                            isThreeLine: true,
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
                      onPressed: () => ref.invalidate(smsLogsProvider(params)),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
