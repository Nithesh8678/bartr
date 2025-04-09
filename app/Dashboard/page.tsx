import React from 'react'

const page = () => {
  return (
    <div className='flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8'>
      {/* Header */}
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold'>Bartr Dashboard</h1>
        <div className='flex items-center gap-4'>
          <span className='text-gray-300'>You are: <span className='text-blue-400 font-semibold'>User 1</span></span>
          <button className='bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors'>
            Submit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex gap-8 flex-1'>
        {/* User 1 Section (Current User) */}
        <div className='flex-1 bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-blue-500'>
          <div className='flex justify-between items-center mb-4'>
            <div className='flex items-center gap-2'>
              <h2 className='text-2xl font-semibold'>User 1</h2>
              <span className='px-2 py-1 rounded-full bg-blue-500 text-xs'>You</span>
            </div>
            <span className='px-4 py-1 rounded-full bg-green-500 text-sm'>Submitted</span>
          </div>
          <div className='space-y-4'>
            <div className='bg-gray-700 p-4 rounded-lg'>
              <h3 className='text-lg font-medium mb-2'>Your Submission</h3>
              <p className='text-gray-300'>Project proposal document</p>
            </div>
            <button className='w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors'>
              Post Your Submission
            </button>
          </div>
        </div>

        {/* User 2 Section (Other User) */}
        <div className='flex-1 bg-gray-800 rounded-xl p-6 shadow-lg'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-2xl font-semibold'>User 2</h2>
            <span className='px-4 py-1 rounded-full bg-red-500 text-sm'>Pending</span>
          </div>
          <div className='space-y-4'>
            <div className='bg-gray-700 p-4 rounded-lg'>
              <h3 className='text-lg font-medium mb-2'>Status</h3>
              <p className='text-gray-300'>Awaiting submission from User 2</p>
            </div>
            <div className='text-center text-gray-400 py-2'>
              Only User 2 can submit their part
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default page
