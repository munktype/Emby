﻿using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Model.Logging;
using SQLitePCL.pretty;
using System.Linq;
using SQLitePCL;

namespace Emby.Server.Implementations.Data
{
    public abstract class BaseSqliteRepository : IDisposable
    {
        protected string DbFilePath { get; set; }
        protected ReaderWriterLockSlim WriteLock;

        protected ILogger Logger { get; private set; }

        protected BaseSqliteRepository(ILogger logger)
        {
            Logger = logger;

            WriteLock = AllowLockRecursion ?
              new ReaderWriterLockSlim(LockRecursionPolicy.SupportsRecursion) :
              new ReaderWriterLockSlim(LockRecursionPolicy.NoRecursion);
        }

        protected virtual bool AllowLockRecursion
        {
            get { return false; }
        }

        static BaseSqliteRepository()
        {
            SQLite3.EnableSharedCache = false;

            int rc = raw.sqlite3_config(raw.SQLITE_CONFIG_MEMSTATUS, 0);
            //CheckOk(rc);
        }

        private static bool _versionLogged;

        protected SQLiteDatabaseConnection CreateConnection(bool isReadOnly = false, Action<SQLiteDatabaseConnection> onConnect = null)
        {
            if (!_versionLogged)
            {
                _versionLogged = true;
                Logger.Info("Sqlite version: " + SQLite3.Version);
                Logger.Info("Sqlite compiler options: " + string.Join(",", SQLite3.CompilerOptions.ToArray()));
            }

            ConnectionFlags connectionFlags;

            isReadOnly = false;

            if (isReadOnly)
            {
                connectionFlags = ConnectionFlags.ReadOnly;
                //connectionFlags = ConnectionFlags.Create;
                //connectionFlags |= ConnectionFlags.ReadWrite;
            }
            else
            {
                connectionFlags = ConnectionFlags.Create;
                connectionFlags |= ConnectionFlags.ReadWrite;
            }

            connectionFlags |= ConnectionFlags.SharedCached;
            connectionFlags |= ConnectionFlags.NoMutex;

            var db = SQLite3.Open(DbFilePath, connectionFlags, null);

            var queries = new List<string>
            {
                "pragma temp_store = memory",
                "PRAGMA page_size=4096",
                "PRAGMA journal_mode=WAL",
                "pragma synchronous=Normal",
                //"PRAGMA cache size=-10000"
            };

            //var cacheSize = CacheSize;
            //if (cacheSize.HasValue)
            //{

            //}

            ////foreach (var query in queries)
            ////{
            ////    db.Execute(query);
            ////}

            using (WriteLock.Write())
            {
                db.ExecuteAll(string.Join(";", queries.ToArray()));

                if (onConnect != null)
                {
                    onConnect(db);
                }
            }

            return db;
        }

        protected virtual int? CacheSize
        {
            get
            {
                return null;
            }
        }

        internal static void CheckOk(int rc)
        {
            string msg = "";

            if (raw.SQLITE_OK != rc)
            {
                throw CreateException((ErrorCode)rc, msg);
            }
        }

        internal static Exception CreateException(ErrorCode rc, string msg)
        {
            var exp = new Exception(msg);

            return exp;
        }

        private bool _disposed;
        protected void CheckDisposed()
        {
            if (_disposed)
            {
                throw new ObjectDisposedException(GetType().Name + " has been disposed and cannot be accessed.");
            }
        }

        public void Dispose()
        {
            _disposed = true;
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        private readonly object _disposeLock = new object();

        /// <summary>
        /// Releases unmanaged and - optionally - managed resources.
        /// </summary>
        /// <param name="dispose"><c>true</c> to release both managed and unmanaged resources; <c>false</c> to release only unmanaged resources.</param>
        protected virtual void Dispose(bool dispose)
        {
            if (dispose)
            {
                try
                {
                    lock (_disposeLock)
                    {
                        using (WriteLock.Write())
                        {
                            CloseConnection();
                        }
                    }
                }
                catch (Exception ex)
                {
                    Logger.ErrorException("Error disposing database", ex);
                }
            }
        }

        protected virtual void CloseConnection()
        {

        }

        protected List<string> GetColumnNames(IDatabaseConnection connection, string table)
        {
            var list = new List<string>();

            foreach (var row in connection.Query("PRAGMA table_info(" + table + ")"))
            {
                if (row[1].SQLiteType != SQLiteType.Null)
                {
                    var name = row[1].ToString();

                    list.Add(name);
                }
            }

            return list;
        }

        protected void AddColumn(IDatabaseConnection connection, string table, string columnName, string type, List<string> existingColumnNames)
        {
            if (existingColumnNames.Contains(columnName, StringComparer.OrdinalIgnoreCase))
            {
                return;
            }

            connection.Execute("alter table " + table + " add column " + columnName + " " + type + " NULL");
        }
    }

    public static class ReaderWriterLockSlimExtensions
    {
        private sealed class ReadLockToken : IDisposable
        {
            private ReaderWriterLockSlim _sync;
            public ReadLockToken(ReaderWriterLockSlim sync)
            {
                _sync = sync;
                sync.EnterReadLock();
            }
            public void Dispose()
            {
                if (_sync != null)
                {
                    _sync.ExitReadLock();
                    _sync = null;
                }
            }
        }
        private sealed class WriteLockToken : IDisposable
        {
            private ReaderWriterLockSlim _sync;
            public WriteLockToken(ReaderWriterLockSlim sync)
            {
                _sync = sync;
                sync.EnterWriteLock();
            }
            public void Dispose()
            {
                if (_sync != null)
                {
                    _sync.ExitWriteLock();
                    _sync = null;
                }
            }
        }

        public static IDisposable Read(this ReaderWriterLockSlim obj)
        {
            return new ReadLockToken(obj);
        }
        public static IDisposable Write(this ReaderWriterLockSlim obj)
        {
            return new WriteLockToken(obj);
        }
    }
}