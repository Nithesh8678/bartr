import React from 'react'

const page = () => {
  return (
    <div className='flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8'>
      {/* Header */}
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold'>Bartr Skill Search</h1>
        <div className='flex items-center gap-4'>
          <span className='text-gray-300'>Find your perfect match</span>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex justify-center items-center'>
        <div className='w-full max-w-2xl bg-gray-800 rounded-xl p-8 shadow-lg'>
          <div className='space-y-6'>
            <h2 className='text-2xl font-semibold text-center'>Search Your Needed Skill</h2>
            <div className='space-y-4'>
              <input
                className='w-full h-12 px-4 rounded-lg bg-gray-700 border-2 border-gray-600 focus:border-blue-500 focus:outline-none text-lg transition-colors'
                placeholder='Enter skill or expertise...'
              />
              <button className='w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition-colors text-lg font-medium'>
                Search Skills
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default page