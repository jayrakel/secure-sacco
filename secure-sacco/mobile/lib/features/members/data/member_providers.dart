import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'member_dto.dart';
import 'member_repository.dart';

class MemberListFilter {
  final String query;
  final String status;
  final int page;
  final int size;

  MemberListFilter({
    this.query = '',
    this.status = 'ALL',
    this.page = 0,
    this.size = 10,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MemberListFilter &&
          runtimeType == other.runtimeType &&
          query == other.query &&
          status == other.status &&
          page == other.page &&
          size == other.size;

  @override
  int get hashCode => query.hashCode ^ status.hashCode ^ page.hashCode ^ size.hashCode;
}

class MemberListFilterNotifier extends Notifier<MemberListFilter> {
  @override
  MemberListFilter build() => MemberListFilter();

  void updateFilter({String? query, String? status}) {
    state = MemberListFilter(
      query: query ?? state.query,
      status: status ?? state.status,
      page: 0, // Reset to 0 when filter changes
      size: state.size,
    );
  }

  void nextPage(int maxPages) {
    if (state.page < maxPages - 1) {
      state = MemberListFilter(
        query: state.query,
        status: state.status,
        page: state.page + 1,
        size: state.size,
      );
    }
  }

  void prevPage() {
    if (state.page > 0) {
      state = MemberListFilter(
        query: state.query,
        status: state.status,
        page: state.page - 1,
        size: state.size,
      );
    }
  }
}

final memberListFilterProvider = NotifierProvider<MemberListFilterNotifier, MemberListFilter>(() {
  return MemberListFilterNotifier();
});

final memberListProvider = FutureProvider.autoDispose<PaginatedMemberResponse>((ref) async {
  final repository = ref.watch(memberRepositoryProvider);
  final filter = ref.watch(memberListFilterProvider);
  return repository.getMembers(
    query: filter.query,
    status: filter.status,
    page: filter.page,
    size: filter.size,
  );
});

final memberDetailProvider = FutureProvider.autoDispose.family<MemberDto, String>((ref, id) async {
  final repository = ref.watch(memberRepositoryProvider);
  return repository.getMember(id);
});
