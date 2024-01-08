// Copyright (C) 2024 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

using System;
using System.Collections.Generic;

namespace NVault.VaultExtensions
{
    /// <summary>
    /// Represents a user auth token access scope 
    /// configuration.
    /// </summary>
    public interface IClientAccessScope
    {
        /// <summary>
        /// The list of policies for new token generation
        /// </summary>
        IList<string> Policies { get; }

        /// <summary>
        /// Allows the user to renew the access token
        /// </summary>
        bool Renewable { get; }

        /// <summary>
        /// The token
        /// </summary>
        string TokenTtl { get; }

        /// <summary>
        /// The explicit number of token uses allowed by the genreated token,
        /// 0 for unlimited uses
        /// </summary>
        int NumberOfUses { get; }
    }
}