import {
  CommentThreadStatus,
  CommentType,
  OutputFormat,
  type Comment,
  type CommentThread,
  type CommentThreadContext,
  type Identity,
  type PRCommentsOptions,
  type ThreadsResponse,
} from '../../../src/types/comment.types.js';

describe('Comment Types', () => {
  describe('CommentThreadStatus Enum', () => {
    it('should have correct values', () => {
      expect(CommentThreadStatus.Active).toBe('active');
      expect(CommentThreadStatus.Fixed).toBe('fixed');
      expect(CommentThreadStatus.WontFix).toBe('wontFix');
      expect(CommentThreadStatus.Closed).toBe('closed');
      expect(CommentThreadStatus.ByDesign).toBe('byDesign');
      expect(CommentThreadStatus.Pending).toBe('pending');
      expect(CommentThreadStatus.Unknown).toBe('unknown');
    });
  });

  describe('CommentType Enum', () => {
    it('should have correct values', () => {
      expect(CommentType.Text).toBe('text');
      expect(CommentType.CodeChange).toBe('codeChange');
      expect(CommentType.System).toBe('system');
    });
  });

  describe('Type Definitions', () => {
    it('should accept valid Identity object', () => {
      const identity: Identity = {
        id: 'user-123',
        displayName: 'John Doe',
        uniqueName: 'john.doe@example.com',
        imageUrl: 'https://example.com/avatar.jpg',
      };
      expect(identity.id).toBe('user-123');
      expect(identity.displayName).toBe('John Doe');
    });

    it('should accept valid Comment object', () => {
      const comment: Comment = {
        id: 1,
        content: 'This looks good!',
        author: {
          id: 'user-123',
          displayName: 'John Doe',
          uniqueName: 'john.doe@example.com',
        },
        publishedDate: '2024-01-01T00:00:00Z',
        commentType: CommentType.Text,
        isDeleted: false,
      };
      expect(comment.id).toBe(1);
      expect(comment.content).toBe('This looks good!');
    });

    it('should accept valid CommentThreadContext object', () => {
      const context: CommentThreadContext = {
        filePath: 'src/index.ts',
        rightFileStart: { line: 10, offset: 0 },
        rightFileEnd: { line: 15, offset: 0 },
      };
      expect(context.filePath).toBe('src/index.ts');
      expect(context.rightFileStart?.line).toBe(10);
    });

    it('should accept valid CommentThread object', () => {
      const thread: CommentThread = {
        id: 1,
        publishedDate: '2024-01-01T00:00:00Z',
        comments: [],
        status: CommentThreadStatus.Active,
        isDeleted: false,
      };
      expect(thread.id).toBe(1);
      expect(thread.status).toBe('active');
    });

    it('should accept valid PRCommentsOptions object', () => {
      const options: PRCommentsOptions = {
        output: OutputFormat.Table,
        chronological: false,
        open: false,
      };
      expect(options.output).toBe('table');
      expect(options.chronological).toBe(false);
    });

    it('should accept valid ThreadsResponse object', () => {
      const response: ThreadsResponse = {
        value: [],
        count: 0,
      };
      expect(response.count).toBe(0);
      expect(Array.isArray(response.value)).toBe(true);
    });
  });
});
